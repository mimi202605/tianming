// ============================================================
// tm-player-tech.js — 穿越模式·玩家科技研发系统（Phase 4.5 · Task 18）
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（明清内廷秘书
//   机构、特务缉捕机构、科举文体、奏报文书专称、地方督抚专称、宗藩封爵
//   专称等一律由剧本 hook）。固定科技路线取中国古代通用脉络；剧本可加朝代
//   专属支线（如某朝火器、某朝活字）——通过 P.customTechRoutes 覆盖/扩展。
//   机构名目（工部 / 匠官 / 钦差 / 督造）一律由剧本 hook·引擎层朝代中立。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerTech.{
//   FIELDS, TECH_ROUTES_DEFAULT,
//   getRoutes, getFieldRoute, getTechStatus, getTechById, parseTechId,
//   getLedger, getCurrentResearch, getCompleted, getDiscoveries, getBoosts, getRetainedArtisans,
//   startResearch, tickResearch, completeResearch,
//   recruitArtisan,
//   petitionToPromulgate, retainPrivate,
//   renderTechPanel
// }
// 依赖（运行时软依赖·缺席降级）：
//   - TM.PlayerEconomy.spend / spendCash    （扣银钱·tm-player-economy.js）
//   - TM.PlayerInteraction.interact(npc, 'recruit', payload)  （招揽匠人·tm-player-interaction.js）
//   - TM.Transmigration.isTransmigrationMode （模式判定·tm-transmigration.js）
//   - global.callAI / callLLM               （运行时 LLM 适配）
//   - GM._playerTech / P.customTechRoutes / GM.turn / P.playerInfo.characterName
// 双路径挂载：浏览器走 window.TM.PlayerTech；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  // ════════════════════════════════════════════════════════════
  //  §1 SubTask 18.1 命名空间 + §18.3 默认路线引用
  // ════════════════════════════════════════════════════════════

  if (!global.TM) global.TM = {};

  // 默认路线来自 tm-tech-routes-data.js（缺席时本模块内联兜底·保证引擎层永不空）
  var TECH_ROUTES_DEFAULT;
  try {
    if (typeof global.TECH_ROUTES_DEFAULT === 'object' && global.TECH_ROUTES_DEFAULT) {
      TECH_ROUTES_DEFAULT = global.TECH_ROUTES_DEFAULT;
    } else if (typeof window !== 'undefined' && typeof window.TECH_ROUTES_DEFAULT === 'object' && window.TECH_ROUTES_DEFAULT) {
      TECH_ROUTES_DEFAULT = window.TECH_ROUTES_DEFAULT;
    }
  } catch (_) {}
  if (!TECH_ROUTES_DEFAULT) {
    // 极端兜底（tm-tech-routes-data.js 未装载·本模块自带的 5 条主线骨架）
    TECH_ROUTES_DEFAULT = {
      agriculture: { label: '农业', levels: [
        { name: '农具改良', cost: 200, requires: [], boost: { food: +5 }, era: 0, desc: '改良犁锹·开荒拓亩' },
        { name: '良种选育', cost: 400, requires: ['agriculture.0'], boost: { food: +8 }, era: 0, desc: '择优留种·抗逆丰产' },
        { name: '水利灌溉', cost: 700, requires: ['agriculture.1'], boost: { food: +12 }, era: 1, desc: '引水入田·旱涝保收' },
        { name: '耕作制度', cost: 1100, requires: ['agriculture.2'], boost: { food: +16 }, era: 1, desc: '轮作休耕·地力常新' },
        { name: '多熟种植', cost: 1600, requires: ['agriculture.3'], boost: { food: +22 }, era: 2, desc: '一年两熟·江南可三熟' }
      ]},
      military: { label: '军事', levels: [
        { name: '冶铁锻造', cost: 250, requires: [], boost: { strength: +5 }, era: 0, desc: '铁制兵器渐代铜器' },
        { name: '弩机改良', cost: 500, requires: ['military.0'], boost: { strength: +8 }, era: 0, desc: '强弩利远·阵射有度' },
        { name: '甲胄升级', cost: 850, requires: ['military.1'], boost: { defense: +10 }, era: 1, desc: '甲胄坚厚·士卒少伤' },
        { name: '攻城器械', cost: 1300, requires: ['military.2'], boost: { strength: +12 }, era: 1, desc: '云梯冲车·城池可下' },
        { name: '火药初探', cost: 1900, requires: ['military.3'], boost: { strength: +18 }, era: 2, desc: '炼丹偶得·军用初探' }
      ]},
      craft: { label: '工艺', levels: [
        { name: '纺织改进', cost: 200, requires: [], boost: { craft: +5, commerce: +3 }, era: 0, desc: '织机渐精·布帛丰厚' },
        { name: '陶瓷烧制', cost: 450, requires: ['craft.0'], boost: { craft: +8, commerce: +5 }, era: 0, desc: '窑火纯青·名瓷行远' },
        { name: '造纸印刷', cost: 800, requires: ['craft.1'], boost: { craft: +10, learning: +4 }, era: 1, desc: '纸薄字清·典籍广布' },
        { name: '冶铸高炉', cost: 1250, requires: ['craft.2'], boost: { craft: +13, strength: +4 }, era: 1, desc: '高炉炼铁·百器皆利' },
        { name: '雕版活字', cost: 1800, requires: ['craft.3'], boost: { craft: +16, learning: +8 }, era: 2, desc: '活字排印·文教大兴' }
      ]},
      medicine: { label: '医药', levels: [
        { name: '本草整理', cost: 250, requires: [], boost: { health: +5 }, era: 0, desc: '集录草药·辨性知毒' },
        { name: '方剂编纂', cost: 500, requires: ['medicine.0'], boost: { health: +8 }, era: 0, desc: '验方集要·临证有据' },
        { name: '针灸推拿', cost: 850, requires: ['medicine.1'], boost: { health: +10 }, era: 1, desc: '针石导引·经络通畅' },
        { name: '疫病防治', cost: 1300, requires: ['medicine.2'], boost: { health: +14 }, era: 1, desc: '辨瘟施药·一方得安' },
        { name: '法医检验', cost: 1850, requires: ['medicine.3'], boost: { health: +6, justice: +8 }, era: 2, desc: '检骨验伤·狱讼得明' }
      ]},
      water: { label: '水利', levels: [
        { name: '沟渠疏浚', cost: 220, requires: [], boost: { food: +4 }, era: 0, desc: '通沟洫·除水患' },
        { name: '陂塘修筑', cost: 480, requires: ['water.0'], boost: { food: +7 }, era: 0, desc: '蓄水防旱·溉田千顷' },
        { name: '堰坝工程', cost: 820, requires: ['water.1'], boost: { food: +10, defense: +3 }, era: 1, desc: '筑堰截流·利农兼防' },
        { name: '运河开凿', cost: 1350, requires: ['water.2'], boost: { commerce: +12, food: +6 }, era: 2, desc: '贯通南北·漕运通商' },
        { name: '海塘修筑', cost: 1950, requires: ['water.3'], boost: { commerce: +8, defense: +6 }, era: 2, desc: '捍海御潮·滨海得安' }
      ]}
    };
  }

  // 5 条主线键名·顺序固定（面板渲染用）
  var FIELDS = ['agriculture', 'military', 'craft', 'medicine', 'water'];

  // ════════════════════════════════════════════════════════════
  //  §2 工具函数（朝代中立·软依赖降级）
  // ════════════════════════════════════════════════════════════

  function _isStr(v) { return typeof v === 'string'; }
  function _isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }

  function _turn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }

  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerTech]', m); } catch (_) {}
  }

  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function _playerChar() {
    try {
      if (typeof GM === 'undefined' || !GM || !Array.isArray(GM.chars)) return null;
      var pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
      var name = pi && pi.characterName;
      for (var i = 0; i < GM.chars.length; i++) {
        var c = GM.chars[i];
        if (!c) continue;
        if (c.isPlayer === true) return c;
        if (name && c.name === name) return c;
      }
    } catch (_) {}
    return null;
  }

  function _findChar(name) {
    try {
      if (typeof GM === 'undefined' || !GM || !Array.isArray(GM.chars)) return null;
      if (!name) return null;
      for (var i = 0; i < GM.chars.length; i++) {
        var c = GM.chars[i];
        if (c && c.name === name) return c;
      }
    } catch (_) {}
    return null;
  }

  function _isTransmigration() {
    try {
      if (global.TM && global.TM.Transmigration && typeof global.TM.Transmigration.isTransmigrationMode === 'function') {
        return !!global.TM.Transmigration.isTransmigrationMode();
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) return P.playerInfo.transmigrationMode === true;
    } catch (_) {}
    return false;
  }

  // 玩家学识（learning 字段·缺席 50 中性值）
  function _playerLearning() {
    var c = _playerChar();
    if (c && _isNum(c.learning)) return c.learning;
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && _isNum(P.playerInfo.learning)) {
        return P.playerInfo.learning;
      }
    } catch (_) {}
    return 50;
  }

  // 时代限制系数（0-3·剧本可挂 P.eraLevel·缺席按 GM.turn 推导）
  function _eraLevel() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && _isNum(P.playerInfo.eraLevel)) {
        return _clamp(P.playerInfo.eraLevel, 0, 3);
      }
      if (typeof P !== 'undefined' && P && _isNum(P.eraLevel)) {
        return _clamp(P.eraLevel, 0, 3);
      }
    } catch (_) {}
    // 兜底·按 turn 推导（0-30 / 31-80 / 81+·对应上古/中古/近古）
    var t = _turn();
    if (t <= 30) return 0;
    if (t <= 80) return 1;
    return 2;
  }

  // LLM 调用·主路径 global.callAI·备用 callLLM·缺席返回 null
  function _callLLM(prompt) {
    try { if (typeof global.callAI === 'function') return global.callAI(prompt); } catch (_) {}
    try { if (typeof callAI === 'function') return callAI(prompt); } catch (_) {}
    try { if (typeof callLLM === 'function') return callLLM(prompt); } catch (_) {}
    return null;
  }

  // ════════════════════════════════════════════════════════════
  //  §3 SubTask 18.2 玩家科技账本
  // ════════════════════════════════════════════════════════════
  //
  // 账本挂在 GM._playerTech（与 task spec 规范 5 一致·arch-ok 行内豁免）：
  //   {
  //     currentResearch: null | { field, level, progress, invested, startedTurn, artisanBoost },
  //     completed:       [ 'agriculture.0', 'agriculture.1', ... ],
  //     discoveries:     [ { id, name, field, level, turn, path } ],   // 完成时的发现记录
  //     boosts:          { food: 5, strength: 8, ... },                 // 已激活的累计增益
  //     retainedArtisans:[ { name, field, bonus, turn } ]               // 招揽到的匠人门客清单
  //   }

  function _defaultLedger() {
    return {
      currentResearch: null,
      completed: [],
      discoveries: [],
      boosts: {},
      retainedArtisans: []
    };
  }

  function _ledger() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerTech || typeof GM._playerTech !== 'object') {
        GM._playerTech = _defaultLedger(); // arch-ok (玩家科技账本初始化·task spec 规范 5)
      }
      var l = GM._playerTech;
      // 容错·保证字段齐
      if (!l.completed || !Array.isArray(l.completed)) l.completed = []; // arch-ok
      if (!l.discoveries || !Array.isArray(l.discoveries)) l.discoveries = []; // arch-ok
      if (!l.boosts || typeof l.boosts !== 'object') l.boosts = {}; // arch-ok
      if (!l.retainedArtisans || !Array.isArray(l.retainedArtisans)) l.retainedArtisans = []; // arch-ok
      return l;
    } catch (_) { return null; }
  }

  function getLedger() {
    var l = _ledger();
    return l ? JSON.parse(JSON.stringify(l)) : null;
  }
  function getCurrentResearch() {
    var l = _ledger();
    return l && l.currentResearch ? JSON.parse(JSON.stringify(l.currentResearch)) : null;
  }
  function getCompleted() {
    var l = _ledger();
    return l ? l.completed.slice() : [];
  }
  function getDiscoveries() {
    var l = _ledger();
    return l ? l.discoveries.slice() : [];
  }
  function getBoosts() {
    var l = _ledger();
    return l ? Object.assign({}, l.boosts) : {};
  }
  function getRetainedArtisans() {
    var l = _ledger();
    return l ? l.retainedArtisans.slice() : [];
  }

  // ════════════════════════════════════════════════════════════
  //  §4 SubTask 18.6 路线数据：merge 默认 + 剧本（覆盖/扩展）
  // ════════════════════════════════════════════════════════════
  //
  // 剧本挂载点：P.customTechRoutes
  //   形态 A（覆盖默认整条线）：{ agriculture: { label:'农事', levels:[...5 个...] } }
  //   形态 B（追加支线）：{ gunpowder: { label:'火器', levels:[...5 个...] } }
  //   形态 C（追加级别·末尾扩展）：{ agriculture: { extend:[{name:'...',cost,requires,boost,era,desc}] } }
  //
  // 返回深合并后的 routes 对象（每次调用都 fresh merge·不污染默认数据）

  function _deepCloneRoutes(r) {
    var out = {};
    Object.keys(r).forEach(function (f) {
      var route = r[f];
      out[f] = {
        label: route.label || f,
        levels: (route.levels || []).map(function (lv) {
          return {
            name: lv.name,
            cost: lv.cost,
            requires: (lv.requires || []).slice(),
            boost: Object.assign({}, lv.boost || {}),
            era: _isNum(lv.era) ? lv.era : 0,
            desc: lv.desc || ''
          };
        })
      };
    });
    return out;
  }

  function getRoutes() {
    var routes = _deepCloneRoutes(TECH_ROUTES_DEFAULT);
    try {
      if (typeof P === 'undefined' || !P || !P.customTechRoutes) return routes;
      var cr = P.customTechRoutes;
      Object.keys(cr).forEach(function (f) {
        var ext = cr[f];
        if (!ext || typeof ext !== 'object') return;
        if (Array.isArray(ext.levels) && ext.levels.length) {
          // 形态 A：覆盖默认整条线
          routes[f] = {
            label: ext.label || routes[f].label || f,
            levels: ext.levels.map(function (lv) {
              return {
                name: lv.name,
                cost: lv.cost,
                requires: (lv.requires || []).slice(),
                boost: Object.assign({}, lv.boost || {}),
                era: _isNum(lv.era) ? lv.era : 0,
                desc: lv.desc || ''
              };
            })
          };
        } else if (Array.isArray(ext.extend) && ext.extend.length) {
          // 形态 C：在默认线末尾追加级别
          if (routes[f]) {
            routes[f].levels = routes[f].levels.concat(ext.extend.map(function (lv) {
              return {
                name: lv.name,
                cost: lv.cost,
                requires: (lv.requires || []).slice(),
                boost: Object.assign({}, lv.boost || {}),
                era: _isNum(lv.era) ? lv.era : 0,
                desc: lv.desc || ''
              };
            }));
          } else {
            // 默认线不存在·按整条新线处理
            routes[f] = {
              label: ext.label || f,
              levels: ext.extend.map(function (lv) {
                return {
                  name: lv.name, cost: lv.cost,
                  requires: (lv.requires || []).slice(),
                  boost: Object.assign({}, lv.boost || {}),
                  era: _isNum(lv.era) ? lv.era : 0,
                  desc: lv.desc || ''
                };
              })
            };
          }
        } else if (ext.label && Array.isArray(ext.levels)) {
          routes[f] = { label: ext.label, levels: ext.levels.map(function (lv) {
            return { name: lv.name, cost: lv.cost, requires: (lv.requires||[]).slice(),
              boost: Object.assign({}, lv.boost||{}), era: _isNum(lv.era)?lv.era:0, desc: lv.desc||'' };
          })};
        }
      });
    } catch (_) {}
    return routes;
  }

  function getFieldRoute(field) {
    var routes = getRoutes();
    return routes[field] || null;
  }

  // 解析 techId 'agriculture.0' → { field:'agriculture', level:0 }
  function parseTechId(id) {
    if (!_isStr(id)) return null;
    var parts = id.split('.');
    if (parts.length !== 2) return null;
    var level = parseInt(parts[1], 10);
    if (isNaN(level) || level < 0) return null;
    return { field: parts[0], level: level };
  }

  function getTechById(id) {
    var p = parseTechId(id);
    if (!p) return null;
    var route = getFieldRoute(p.field);
    if (!route || !route.levels || p.level >= route.levels.length) return null;
    var lv = route.levels[p.level];
    return Object.assign({ id: id, field: p.field, level: p.level, label: route.label }, lv);
  }

  // ════════════════════════════════════════════════════════════
  //  §5 SubTask 18.5 前置科技解锁·状态判定
  // ════════════════════════════════════════════════════════════
  //
  // 状态机（每条线 × 每级）：
  //   'completed'    —— completed[] 含此 techId
  //   'in-progress'  —— currentResearch.field/level 对应此 techId
  //   'locked'       —— 某条 requires 未完成 → 禁用按钮·提示"需先研发 X"
  //   'era-locked'   —— 前置已完成·但 era > 当前时代·允许立项但进度衰减
  //   'available'    —— 前置全完成·可立项

  function _isCompleted(id) {
    var l = _ledger();
    return !!(l && l.completed && l.completed.indexOf(id) >= 0);
  }

  function _missingPrereqs(lv) {
    var missing = [];
    if (!lv || !lv.requires || !lv.requires.length) return missing;
    for (var i = 0; i < lv.requires.length; i++) {
      var req = lv.requires[i];
      if (!_isCompleted(req)) missing.push(req);
    }
    return missing;
  }

  function getTechStatus(field, levelIdx) {
    var route = getFieldRoute(field);
    if (!route || !route.levels || levelIdx < 0 || levelIdx >= route.levels.length) {
      return { status: 'invalid', reason: '未知科技: ' + field + '.' + levelIdx };
    }
    var id = field + '.' + levelIdx;
    if (_isCompleted(id)) return { status: 'completed', id: id };
    var l = _ledger();
    if (l && l.currentResearch && l.currentResearch.field === field && l.currentResearch.level === levelIdx) {
      return { status: 'in-progress', id: id, progress: l.currentResearch.progress };
    }
    var lv = route.levels[levelIdx];
    var missing = _missingPrereqs(lv);
    if (missing.length) {
      // 锁定·提示"需先研发 X"（X = 第一条前置科技的名字）
      var firstMissing = getTechById(missing[0]);
      return {
        status: 'locked',
        id: id,
        missing: missing,
        hint: '需先研发 ' + (firstMissing ? firstMissing.name : missing[0])
      };
    }
    // 前置全完成·检查时代限制
    var era = _isNum(lv.era) ? lv.era : 0;
    var curEra = _eraLevel();
    if (era > curEra) {
      return { status: 'era-locked', id: id, era: era, currentEra: curEra };
    }
    return { status: 'available', id: id };
  }

  // ════════════════════════════════════════════════════════════
  //  §6 SubTask 18.4 启动研发：扣银钱·计算进度
  // ════════════════════════════════════════════════════════════
  //
  // 主入口：startResearch(field, opts)
  //   opts.invest  —— 额外银钱投入（加成进度·可选·默认 0）
  //   opts.level   —— 显式指定研发第几级（可选·缺省取该线 next 可立项级）
  //
  // 进度计算公式（按 spec.md Scenario: 玩家启动研发）：
  //   progress = (learning × 0.4 + invest × 0.02 + base × 0.6 + eraBonus × 30) / cost × 100
  //   其中：
  //     learning    —— 玩家学识（0-100）
  //     invest      —— 额外投入银钱（opts.invest·可选）
  //     base        —— 基础分（同线已完成级别数 × 10）
  //     eraBonus    —— 时代限制系数差（curEra - era）∈ [-3, +3]
  //   即：学识越高/投入越多/同线底子越厚/时代越先进 → 进度越快
  //
  // 单次启动扣银钱 = tech.cost（研发启动费·必扣）
  //                  + opts.invest（额外投入·可选·按比例加进度）
  // 当 progress >= 100 时自动触发 completeResearch()·返回 completed

  function _spendCash(amount, label) {
    // 主路径：TM.PlayerEconomy.spendCash / spend（task spec 接口约定·实际 tm-player-economy.js 暴露的是 spend）
    try {
      if (global.TM && global.TM.PlayerEconomy) {
        var pe = global.TM.PlayerEconomy;
        if (typeof pe.spendCash === 'function') {
          var r = pe.spendCash(amount, label);
          if (r && r.ok) return { ok: true, cash: r.cash };
          if (r && r.ok === false) return r;
        }
        if (typeof pe.spend === 'function') {
          var r2 = pe.spend(amount, label);
          if (r2 && r2.ok) return { ok: true, cash: r2.cash };
          if (r2 && r2.ok === false) return r2;
        }
      }
    } catch (_) {}
    // 降级路径：直接扣 P.playerInfo.money / GM.money
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        var cash = _isNum(P.playerInfo.money) ? P.playerInfo.money
                 : _isNum(P.playerInfo.cash) ? P.playerInfo.cash
                 : 0;
        if (cash < amount) return { ok: false, reason: '银钱不足', cash: cash };
        if (_isNum(P.playerInfo.money)) {
          P.playerInfo.money = cash - amount; // arch-ok (玩家银钱账本·降级路径·主路径走 TM.PlayerEconomy)
        } else {
          P.playerInfo.cash = cash - amount; // arch-ok
        }
        return { ok: true, cash: cash - amount };
      }
    } catch (_) {}
    return { ok: false, reason: '账本未就绪' };
  }

  function startResearch(field, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var route = getFieldRoute(field);
    if (!route) return { ok: false, reason: '未知领域: ' + field };

    var l = _ledger();
    if (!l) return { ok: false, reason: '账本未就绪' };

    // 已在研发中·拒绝重复立项
    if (l.currentResearch) {
      return {
        ok: false,
        reason: '已有研发在进行: ' + l.currentResearch.field + '.' + l.currentResearch.level,
        code: 'already-researching'
      };
    }

    // 确定要立项的级别
    var level = _isNum(opts.level) ? opts.level : _nextAvailableLevel(field);
    if (level < 0) return { ok: false, reason: field + ' 已无可立项级别', code: 'all-completed' };

    var status = getTechStatus(field, level);
    if (status.status === 'completed') return { ok: false, reason: '已研发完成: ' + field + '.' + level, code: 'already-completed' };
    if (status.status === 'in-progress') return { ok: false, reason: '已在研发中', code: 'already-researching' };
    if (status.status === 'locked') {
      // 特别断言·未完成 N 级时禁用 N+1 级·提示"需先研发 X"
      return {
        ok: false,
        reason: status.hint,
        code: 'locked',
        missing: status.missing,
        hint: status.hint
      };
    }
    // 'available' / 'era-locked' 均允许立项（era-locked 进度会被衰减）

    var tech = getTechById(field + '.' + level);
    if (!tech) return { ok: false, reason: '科技数据异常: ' + field + '.' + level };

    // 扣银钱：启动费 + 额外投入
    var invest = _isNum(opts.invest) ? Math.max(0, opts.invest) : 0;
    var totalCost = tech.cost + invest;
    var spendR = _spendCash(totalCost, '研发启动·' + tech.name);
    if (!spendR.ok) {
      return { ok: false, reason: '银钱不足（需 ' + totalCost + '）', code: 'no-cash', need: totalCost };
    }

    // 计算初始进度（学识 + 投入 + 基础 + 时代限制）
    var learning = _playerLearning();
    var base = _countCompletedInField(field) * 10;
    var eraBonus = _eraLevel() - (_isNum(tech.era) ? tech.era : 0);
    var progress = _computeProgress(learning, invest, base, eraBonus, tech.cost);

    // 写账本
    l.currentResearch = {
      field: field,
      level: level,
      name: tech.name,
      cost: tech.cost,
      invest: invest,
      progress: progress,
      invested: totalCost,
      startedTurn: _turn(),
      eraBonus: eraBonus,
      learning: learning,
      base: base,
      artisanBoost: 0
    }; // arch-ok (玩家科技账本 currentResearch 写入)

    // 若进度已满·立即触发完成
    if (progress >= 100) {
      var compR = completeResearch({ silent: true });
      return {
        ok: true,
        field: field,
        level: level,
        name: tech.name,
        cost: totalCost,
        cash: spendR.cash,
        progress: progress,
        completed: true,
        completion: compR
      };
    }

    return {
      ok: true,
      field: field,
      level: level,
      name: tech.name,
      cost: totalCost,
      cash: spendR.cash,
      progress: progress
    };
  }

  function _nextAvailableLevel(field) {
    var route = getFieldRoute(field);
    if (!route || !route.levels) return -1;
    for (var i = 0; i < route.levels.length; i++) {
      if (!_isCompleted(field + '.' + i)) return i;
    }
    return -1;
  }

  function _countCompletedInField(field) {
    var l = _ledger();
    if (!l) return 0;
    var n = 0;
    l.completed.forEach(function (id) {
      if (id && id.indexOf(field + '.') === 0) n++;
    });
    return n;
  }

  // 进度计算·核心公式（朝代中立·数值可由剧本微调）
  function _computeProgress(learning, invest, base, eraBonus, cost) {
    if (!_isNum(cost) || cost <= 0) cost = 100;
    var score = learning * 0.4 + invest * 0.02 + base * 0.6 + eraBonus * 30;
    // 归一化到 cost：cost 越高·越难推进
    var progress = (score / cost) * 100;
    return Math.max(1, Math.round(progress));
  }

  // §18.4 续·每回合推进进度（由 endturn pipeline 调用）
  //   每回合自然推进 = learning × 0.2 + artisanBoost × 2
  function tickResearch(opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var l = _ledger();
    if (!l || !l.currentResearch) return { ok: false, reason: '无在研项目' };
    var cr = l.currentResearch;
    var learning = _playerLearning();
    var artisanBoost = _isNum(cr.artisanBoost) ? cr.artisanBoost : 0;
    var tickGain = Math.max(1, Math.round(learning * 0.2 + artisanBoost * 2));
    cr.progress = _clamp(_isNum(cr.progress) ? cr.progress + tickGain : tickGain, 0, 999); // arch-ok
    if (cr.progress >= 100) {
      var compR = completeResearch({ silent: true });
      return { ok: true, tickGain: tickGain, progress: 100, completed: true, completion: compR };
    }
    return { ok: true, tickGain: tickGain, progress: cr.progress };
  }

  // ════════════════════════════════════════════════════════════
  //  §7 SubTask 18.7 招揽匠人加速·关联人物互动系统
  // ════════════════════════════════════════════════════════════
  //
  // recruitArtisan(npcName, opts):
  //   1) 调 TM.PlayerInteraction.interact(npcName, 'recruit', payload)·建立同党关系
  //   2) 按 NPC 匠人特征（specialty/ability/officialTitle 含匠/工/医/算 等）·给当前 currentResearch 加 artisanBoost
  //   3) 匠人入玩家门客清单·retainedArtisans[]·每回合 tick 时持续生效
  // 返回 { ok, npc, boost, scene, ... }
  //
  // 匠人特征识别·跨朝代通用通称（不挂某朝某署）：
  //   农艺：农 / 稻 / 桑 / 蚕
  //   军工：冶 / 锻 / 弩 / 甲 / 矢
  //   工艺：织 / 陶 / 瓷 / 纸 / 印 / 炉
  //   医药：医 / 药 / 草 / 方 / 针 / 灸
  //   水利：水 / 渠 / 堰 / 塘 / 河 / 漕

  var _ARTISAN_KEYWORDS = {
    agriculture: /农|稻|桑|蚕|谷|稼|耕|亩/,
    military:    /冶|锻|弩|甲|矢|兵|矛|戈|戟/,
    craft:       /织|陶|瓷|纸|印|炉|窑|匠|工/,
    medicine:    /医|药|草|方|针|灸|药|诊|脉/,
    water:       /水|渠|堰|塘|河|漕|堤|潮|海/
  };

  function _inferArtisanField(npc) {
    if (!npc) return null;
    var bag = ((npc.officialTitle || '') + ' ' + (npc.title || '') + ' ' + (npc.role || '') + ' ' + (npc.specialty || '') + ' ' + (npc.ability || '')).trim();
    if (!bag) return null;
    for (var i = 0; i < FIELDS.length; i++) {
      var f = FIELDS[i];
      var re = _ARTISAN_KEYWORDS[f];
      if (re && re.test(bag)) return f;
    }
    return null;
  }

  function recruitArtisan(npcName, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    if (!npcName) return { ok: false, reason: '未指定 NPC' };
    var l = _ledger();
    if (!l) return { ok: false, reason: '账本未就绪' };

    var npc = _findChar(npcName);
    if (!npc) return { ok: false, reason: '未找到 NPC: ' + npcName };

    // 1) 调用人物互动系统·recruit = 笼络·建立同党关系
    var interactR = null;
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction.interact === 'function') {
        interactR = global.TM.PlayerInteraction.interact(npcName, 'recruit', {
          topic: opts.topic || '研发襄助',
          intent: opts.intent || '招揽匠人'
        });
      }
    } catch (_) {}
    if (!interactR || interactR.ok === false) {
      return {
        ok: false,
        reason: (interactR && interactR.reason) || '招揽互动失败',
        interact: interactR
      };
    }

    // 2) 识别匠人领域 + 计算加成
    //    匠人专长必须可识别（关键词匹配或显式 opts.field 指定）才能给研发加成
    //    无匹配时仅入清单·bonus=0·不自动套用 currentResearch.field
    //    （玩家可通过 opts.field 显式指定让 NPC 服务于某领域）
    var field = opts.field || _inferArtisanField(npc);
    if (!field) {
      // 未匹配领域·仅入清单·不加成
      l.retainedArtisans.push({ name: npcName, field: null, bonus: 0, turn: _turn() }); // arch-ok
      return {
        ok: true,
        npc: npcName,
        field: null,
        bonus: 0,
        scene: interactR.scene,
        interact: interactR,
        message: '招揽成功·但匠人专长未匹配当前研发'
      };
    }

    // 加成系数·朝代中立·NPC learning/ability 越高加成越大
    var ability = _isNum(npc.learning) ? npc.learning
                : _isNum(npc.ability) ? npc.ability
                : 50;
    var bonus = Math.max(2, Math.round(ability / 20)); // 2-5

    // 3) 写门客清单
    l.retainedArtisans.push({ name: npcName, field: field, bonus: bonus, turn: _turn() }); // arch-ok

    // 4) 若当前正在研发此领域·立即给 currentResearch 加 boost
    var appliedToCurrent = false;
    if (l.currentResearch && l.currentResearch.field === field) {
      l.currentResearch.artisanBoost = (_isNum(l.currentResearch.artisanBoost) ? l.currentResearch.artisanBoost : 0) + bonus; // arch-ok
      // 立即推进一次进度
      l.currentResearch.progress = _clamp((_isNum(l.currentResearch.progress) ? l.currentResearch.progress : 0) + bonus * 2, 0, 999); // arch-ok
      appliedToCurrent = true;

      // 满进度自动完成
      if (l.currentResearch.progress >= 100) {
        var compR = completeResearch({ silent: true });
        return {
          ok: true,
          npc: npcName,
          field: field,
          bonus: bonus,
          scene: interactR.scene,
          interact: interactR,
          appliedToCurrent: true,
          completed: true,
          completion: compR
        };
      }
    }

    return {
      ok: true,
      npc: npcName,
      field: field,
      bonus: bonus,
      scene: interactR.scene,
      interact: interactR,
      appliedToCurrent: appliedToCurrent
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §8 SubTask 18.8 研发完成·解锁对应增益
  // ════════════════════════════════════════════════════════════
  //
  // completeResearch(opts):
  //   1) 把 currentResearch 移入 completed[]
  //   2) 解锁的 boost 累加到 boosts{}（默认私藏自用·生效于玩家自身）
  //   3) 写 discoveries[]（发现记录·用于编年史/史册）
  //   4) 清空 currentResearch（玩家可立项下一项）
  //   5) 触发 prompt·让玩家选"上奏推广" or "私藏自用"（opts.auto=path 可跳过）

  function completeResearch(opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var l = _ledger();
    if (!l) return { ok: false, reason: '账本未就绪' };
    if (!l.currentResearch) return { ok: false, reason: '无在研项目' };

    var cr = l.currentResearch;
    var id = cr.field + '.' + cr.level;
    var tech = getTechById(id);

    // 1) 入 completed[]
    if (l.completed.indexOf(id) < 0) l.completed.push(id); // arch-ok

    // 2) 累加 boost（默认私藏自用·后续 petitionToPromulgate 可叠加全国）
    var boost = (tech && tech.boost) ? tech.boost : {};
    Object.keys(boost).forEach(function (k) {
      l.boosts[k] = (l.boosts[k] || 0) + boost[k]; // arch-ok
    });

    // 3) 写 discoveries[]
    var disc = {
      id: id,
      name: (tech && tech.name) || cr.name || id,
      field: cr.field,
      level: cr.level,
      label: (getFieldRoute(cr.field) || {}).label || cr.field,
      turn: _turn(),
      startedTurn: cr.startedTurn,
      invested: cr.invested || 0,
      boost: boost,
      path: opts.path || 'private'  // private 默认（私藏自用）
    };
    l.discoveries.push(disc); // arch-ok

    // 4) 清空 currentResearch
    l.currentResearch = null; // arch-ok

    // 5) 触发提示（非 silent 模式）
    if (!opts.silent) {
      var msg = '【研发完成】' + disc.label + '·' + disc.name;
      _toast(msg);
    }

    return {
      ok: true,
      id: id,
      name: disc.name,
      field: disc.field,
      level: disc.level,
      boost: boost,
      turn: disc.turn,
      path: disc.path
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §9 SubTask 18.9 上奏推广 / 私藏自用 两条路径
  // ════════════════════════════════════════════════════════════
  //
  // petitionToPromulgate(techId, opts):
  //   - 把已完成的某项科技上奏皇帝 AI·皇帝 AI 决定是否采纳
  //   - 采纳 → 全国获得对应增益（落 GM.boosts 或 GM.nationalTech）
  //   - 不采纳 → 增益仍归玩家私藏·但触发"献艺不纳"事件（剧本 hook）
  //   - LLM 决策路径：global.callAI(prompt) → 文本含"采纳"/"准"/"可" → 采纳
  //     缺席 LLM 时·规则引擎兜底：玩家声望 + 玩家与皇帝关系 + tech.boost 影响
  //
  // retainPrivate(techId, opts):
  //   - 显式标注此科技为"私藏自用"·增益仅作用于玩家本人/封国
  //   - 不上奏·不触发皇帝 AI 决策
  //   - 默认 completeResearch 完成后即私藏·此 API 用于显式变更 path 标记

  function _emperorAdopts(tech, prompt, opts) {
    // 主路径：LLM 决策
    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string') {
      var s = llm.trim();
      // 先检查否定形式·避免"不允/不准/不采纳"等被肯定正则误判为采纳
      //   "皇帝不允" 含"允"但语义为否定·故否定正则必须先匹
      if (/不允|不准|不采纳|不允准|不可|不许|不予|驳回|拒绝|驳斥|否决|不准奏|未准|不纳/.test(s)) {
        return { adopt: false, source: 'llm', raw: s };
      }
      if (/不|拒|驳|否|却/.test(s)) return { adopt: false, source: 'llm', raw: s };
      // 含"采纳/准/可/允/然"视为采纳
      if (/采纳|准奏|允准|可|允|然/.test(s)) return { adopt: true, source: 'llm', raw: s };
    }
    // 降级：规则引擎
    // 采纳概率 = 0.4 + 玩家声望×0.005 + 玩家与皇帝关系×0.003 - tech.cost/10000
    var prestige = 50;
    var sovereignRel = 50;
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (_isNum(P.playerInfo.prestige)) prestige = P.playerInfo.prestige;
        if (_isNum(P.playerInfo.sovereignRelation)) sovereignRel = P.playerInfo.sovereignRelation;
      }
    } catch (_) {}
    var prob = 0.4 + prestige * 0.005 + sovereignRel * 0.003 - (tech.cost || 0) / 10000;
    prob = _clamp(prob, 0.05, 0.95);
    var adopt = Math.random() < prob;
    return { adopt: adopt, source: 'rule', prob: prob };
  }

  function _applyNationalBoost(boost) {
    try {
      if (typeof GM === 'undefined' || !GM) return;
      // 主路径：GM.nationalTech.boosts（剧本可挂）
      if (!GM.nationalTech) GM.nationalTech = { boosts: {}, list: [] }; // arch-ok (全国增益账本·剧本 hook 路径)
      Object.keys(boost).forEach(function (k) {
        GM.nationalTech.boosts[k] = (GM.nationalTech.boosts[k] || 0) + boost[k]; // arch-ok
      });
      if (!GM.nationalTech.list) GM.nationalTech.list = []; // arch-ok
    } catch (_) {}
  }

  function petitionToPromulgate(techId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var l = _ledger();
    if (!l) return { ok: false, reason: '账本未就绪' };
    if (!techId) return { ok: false, reason: '未指定科技' };
    var tech = getTechById(techId);
    if (!tech) return { ok: false, reason: '未知科技: ' + techId };
    if (l.completed.indexOf(techId) < 0) {
      return { ok: false, reason: '尚未研发完成·不可上奏', code: 'not-completed' };
    }

    // 构造 LLM prompt·让皇帝 AI 决策
    var prompt = [
      '【皇帝批奏·科技推广】',
      '玩家奏请推广：' + tech.label + '·' + tech.name,
      tech.desc ? '简介：' + tech.desc : '',
      '增益：' + Object.keys(tech.boost).map(function (k) { return k + '+' + tech.boost[k]; }).join(' '),
      '请以皇帝口吻批复是否采纳推广（含"采纳"或"不"字样以判定）。'
    ].filter(Boolean).join('\n');

    var decision = _emperorAdopts(tech, prompt, opts);

    // 更新 discoveries 中的 path 标记
    var disc = l.discoveries.find(function (d) { return d.id === techId; });
    if (disc) disc.path = decision.adopt ? 'promulgated' : 'petition-rejected'; // arch-ok

    if (decision.adopt) {
      // 全国增益
      _applyNationalBoost(tech.boost);
      _toast('【上奏推广】皇帝准奏·全国推广：' + tech.name);
      return {
        ok: true,
        techId: techId,
        name: tech.name,
        adopt: true,
        decision: decision,
        nationalBoost: tech.boost,
        path: 'promulgated'
      };
    }
    // 不采纳·增益仍归玩家私藏·触发"献艺不纳"
    _toast('【上奏推广】皇帝未准·仍可私藏自用：' + tech.name);
    return {
      ok: true,
      techId: techId,
      name: tech.name,
      adopt: false,
      decision: decision,
      path: 'petition-rejected'
    };
  }

  function retainPrivate(techId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var l = _ledger();
    if (!l) return { ok: false, reason: '账本未就绪' };
    if (!techId) return { ok: false, reason: '未指定科技' };
    var tech = getTechById(techId);
    if (!tech) return { ok: false, reason: '未知科技: ' + techId };
    if (l.completed.indexOf(techId) < 0) {
      return { ok: false, reason: '尚未研发完成·不可标注', code: 'not-completed' };
    }

    // 更新 discoveries 中的 path 标记
    var disc = l.discoveries.find(function (d) { return d.id === techId; });
    if (disc) disc.path = 'private'; // arch-ok

    // boost 已在 completeResearch 时累加到 boosts·此 API 仅显式标 path·不重复加
    _toast('【私藏自用】' + tech.name + '·增益仅作用于自身');
    return {
      ok: true,
      techId: techId,
      name: tech.name,
      path: 'private',
      boost: tech.boost
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §10 SubTask 18.10 御案"科技"面板·可视化科技树
  // ════════════════════════════════════════════════════════════
  //
  // renderTechPanel(targetEl):
  //   - 5 条主线 × 5 级科技树网格
  //   - 每节点显示 status: completed(已解锁) / in-progress(进行中·含进度条) / locked(锁定·灰显) / era-locked(时代限制) / available(可立项)
  //   - locked 节点显示"需先研发 X"提示
  //   - targetEl 传入则写入 innerHTML·否则返回 HTML 字符串

  function renderTechPanel(targetEl) {
    var l = _ledger();
    if (!l) return '<div class="pt-panel-empty">科技账本未就绪</div>';

    var routes = getRoutes();
    var boosts = l.boosts || {};
    var cr = l.currentResearch;

    var h = '<div class="pt-panel" id="ptPanel">';

    // ① 顶部·玩家科技概览
    h += '<div class="pt-section"><div class="pt-section-title">科 技 · 总 览</div>';
    h += '<div class="pt-row"><span>已解锁</span><span class="pt-val">' + l.completed.length + ' 项</span></div>';
    h += '<div class="pt-row"><span>在研</span><span class="pt-val">' + (cr ? (cr.field + '.' + cr.level + ' · ' + (cr.name || '') + ' · ' + (cr.progress || 0) + '%') : '无') + '</span></div>';
    h += '<div class="pt-row"><span>门客匠人</span><span class="pt-val">' + (l.retainedArtisans || []).length + ' 人</span></div>';
    if (Object.keys(boosts).length) {
      h += '<div class="pt-row"><span>已激活增益</span><span class="pt-val pt-boost">' + Object.keys(boosts).map(function (k) { return k + '+' + boosts[k]; }).join(' ') + '</span></div>';
    }
    h += '</div>';

    // ② 科技树·5 条主线
    h += '<div class="pt-tree">';
    Object.keys(routes).forEach(function (field) {
      var route = routes[field];
      if (!route || !route.levels || !route.levels.length) return;
      h += '<div class="pt-line">';
      h += '<div class="pt-line-label">' + _esc((route.label || '').split('').join(' ')) + '</div>';
      h += '<div class="pt-line-levels">';
      for (var i = 0; i < route.levels.length; i++) {
        var lv = route.levels[i];
        var st = getTechStatus(field, i);
        var cls = 'pt-node pt-' + st.status;
        var progressTxt = '';
        if (st.status === 'in-progress' && _isNum(st.progress)) {
          progressTxt = '<div class="pt-progress"><div class="pt-progress-bar" style="width:' + _clamp(st.progress, 0, 100) + '%"></div></div>';
        }
        var hintTxt = '';
        if (st.status === 'locked' && st.hint) {
          hintTxt = '<div class="pt-hint">' + _esc(st.hint) + '</div>';
        } else if (st.status === 'era-locked') {
          hintTxt = '<div class="pt-hint">时代未至</div>';
        }
        h += '<div class="' + cls + '" data-tech="' + field + '.' + i + '">';
        h += '<div class="pt-node-name">' + _esc(lv.name) + '</div>';
        h += '<div class="pt-node-cost">' + (lv.cost || 0) + ' 两</div>';
        h += progressTxt + hintTxt;
        h += '</div>';
      }
      h += '</div>'; // pt-line-levels
      h += '</div>'; // pt-line
    });
    h += '</div>'; // pt-tree

    h += '</div>'; // pt-panel

    // 内嵌样式（与 tm-player-movement.js / tm-transmigration.js 同风格·暗金主调·朝代中立）
    h += '<style>' +
      '.pt-panel{padding:0.8rem 1rem;background:linear-gradient(90deg,rgba(22,15,8,0.84),rgba(40,28,14,0.70) 46%,rgba(15,10,6,0.82));border:1px solid rgba(215,185,104,0.30);border-radius:3px;font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;}' +
      '.pt-panel-empty{padding:1rem;color:var(--color-foreground-muted, #999);font-style:italic;}' +
      '.pt-section{margin-bottom:0.6rem;}' +
      '.pt-section-title{color:var(--gold-400,#d7b968);letter-spacing:0.2em;font-size:1.05rem;border-bottom:1px solid rgba(215,185,104,0.30);padding-bottom:0.3rem;margin-bottom:0.4rem;}' +
      '.pt-row{display:flex;justify-content:space-between;padding:0.2rem 0.4rem;font-size:0.85rem;}' +
      '.pt-val{color:var(--gold-400,#d7b968);}' +
      '.pt-boost{font-size:0.78rem;}' +
      '.pt-tree{margin-top:0.5rem;}' +
      '.pt-line{margin-bottom:0.6rem;padding:0.4rem;background:rgba(0,0,0,0.25);border-radius:3px;}' +
      '.pt-line-label{color:var(--gold-400,#d7b968);font-size:0.9rem;letter-spacing:0.15em;margin-bottom:0.3rem;padding-left:0.4rem;border-left:2px solid var(--gold-500,#b8943c);}' +
      '.pt-line-levels{display:flex;flex-wrap:wrap;gap:0.4rem;}' +
      '.pt-node{flex:1 1 110px;min-width:110px;max-width:160px;padding:0.4rem;background:var(--color-sunken,#1a1a1a);border:1px solid rgba(215,185,104,0.20);border-radius:3px;cursor:default;font-size:0.78rem;}' +
      '.pt-completed{border-color:var(--gold-400,#d7b968);background:linear-gradient(180deg,rgba(215,185,104,0.18),rgba(0,0,0,0.25));}' +
      '.pt-in-progress{border-color:var(--gold-500,#b8943c);background:rgba(184,148,60,0.18);}' +
      '.pt-available{border-color:rgba(140,200,140,0.40);background:rgba(80,140,80,0.10);cursor:pointer;}' +
      '.pt-locked{opacity:0.5;filter:grayscale(0.6);}' +
      '.pt-era-locked{opacity:0.7;border-color:rgba(200,150,80,0.30);}' +
      '.pt-node-name{font-weight:700;color:var(--color-foreground,#eee);margin-bottom:0.2rem;}' +
      '.pt-node-cost{color:var(--color-foreground-muted,#999);font-size:0.7rem;}' +
      '.pt-progress{height:4px;background:rgba(0,0,0,0.4);border-radius:2px;overflow:hidden;margin-top:0.2rem;}' +
      '.pt-progress-bar{height:100%;background:linear-gradient(90deg,var(--gold-500,#b8943c),var(--gold-400,#d7b968));transition:width 0.3s;}' +
      '.pt-hint{font-size:0.68rem;color:var(--vermillion-400,#c84040);margin-top:0.2rem;font-style:italic;}' +
      '</style>';

    if (targetEl && typeof targetEl === 'object') {
      try { targetEl.innerHTML = h; return null; } catch (_) { return h; }
    }
    return h;
  }

  // ════════════════════════════════════════════════════════════
  //  §11 导出命名空间
  // ════════════════════════════════════════════════════════════

  var ns = {
    // 常量
    FIELDS: FIELDS,
    TECH_ROUTES_DEFAULT: TECH_ROUTES_DEFAULT,

    // 路线数据
    getRoutes: getRoutes,
    getFieldRoute: getFieldRoute,
    getTechById: getTechById,
    parseTechId: parseTechId,

    // 状态查询
    getLedger: getLedger,
    getCurrentResearch: getCurrentResearch,
    getCompleted: getCompleted,
    getDiscoveries: getDiscoveries,
    getBoosts: getBoosts,
    getRetainedArtisans: getRetainedArtisans,
    getTechStatus: getTechStatus,

    // 研发主流程
    startResearch: startResearch,
    tickResearch: tickResearch,
    completeResearch: completeResearch,

    // 招揽匠人加速
    recruitArtisan: recruitArtisan,

    // 上奏推广 / 私藏自用
    petitionToPromulgate: petitionToPromulgate,
    retainPrivate: retainPrivate,

    // 御案面板
    renderTechPanel: renderTechPanel,

    // 内部函数（smoke/调试·非游戏调用入口）
    _spendCash: _spendCash,
    _computeProgress: _computeProgress,
    _inferArtisanField: _inferArtisanField,
    _eraLevel: _eraLevel,
    _nextAvailableLevel: _nextAvailableLevel,
    _countCompletedInField: _countCompletedInField,
    _emperorAdopts: _emperorAdopts
  };

  global.TM.PlayerTech = ns;

  // 双路径挂载：浏览器走 window.TM.PlayerTech；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = { PlayerTech: ns };
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
