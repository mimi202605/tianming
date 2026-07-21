// ============================================================
// tm-player-trade.js — 穿越模式 Phase 4.5 · Task 17 玩家跑商系统
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（内阁/票拟/
//   司礼监/东厂/西厂/锦衣卫/军机处/廷杖/八股/巡按/总督/巡抚/郡王/藩王
//   一律由剧本 hook）。
//   - 不写"通关文牒"（明清专名）→ 改用"通关凭引"通称
//   - 不写"市舶司"（明清专名）→ 改用"海贸衙门"通称
//   - 跑商路线（丝路/茶马/漕运/海贸）由剧本 hook，引擎只提供"商队+路线+
//     风险+利润"通用框架，引擎绝不预置朝代特定路线名
//   - 通关凭引、关税、海贸衙门等专名也由剧本 hook
// ------------------------------------------------------------
// 暴露：window.TM.PlayerTrade.{
//   CARAVAN_STATUS, PERMIT_LEVELS, RISK_TYPES, DEFAULT_ROUTES,
//   listCaravans, getCaravan, createCaravan, dispatchTrade,
//   cancelCaravan, settleArrival, listRoutes, getRoute,
//   triggerRiskEvent, getReputation, listNetworks,
//   estimateProfit, renderPanel
// }
// 依赖（运行时软依赖，缺席时降级）：
//   - TM.PlayerEconomy.getBalance / spend / addIncome   （玩家银钱账本）
//   - TM.PlayerInteraction.interact                     （NPC 关系）
//   - GM._playerTrade / GM.turn / GM.chars              （玩家商队账本）
//   - global.callAI / callLLM                           （LLM 适配·与 tm-sovereign-ai.js 一致）
//   - 剧本 hook：P.tradeRoutes / P.tradePrices / P.tradePermits
// 双路径挂载：浏览器走 window.TM.PlayerTrade；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  var TM = global.TM = global.TM || {};

  // ════════════════════════════════════════════════════════════
  //  §1 常量
  // ════════════════════════════════════════════════════════════

  // 商队状态机·朝代中立
  var CARAVAN_STATUS = {
    FORMING:   'forming',    // 组建中（未派遣）
    DISPATCHED:'dispatched', // 已派遣·在路上
    ARRIVED:   'arrived',    // 已到达·待结算
    SETTLED:   'settled',    // 已结算
    CANCELLED: 'cancelled',  // 已取消
    LOST:      'lost'        // 全军覆没（被劫/灾害）
  };

  // 通关凭引等级·许可难度关联官场关系（朝代中立·非"通关文牒"专名）
  //   等级越高·可通商路线越远·但需官场关系门槛越高
  var PERMIT_LEVELS = {
    none:    { label: '无凭引',   cost: 0,    minRelation: 0,   rangeBonus: 0,   desc: '无凭引·仅可短途境内贸易' },
    local:   { label: '境内凭引', cost: 100,  minRelation: 20,  rangeBonus: 1,   desc: '境内凭引·可走州县间商道' },
    regional:{ label: '通郡凭引', cost: 300,  minRelation: 40,  rangeBonus: 2,   desc: '通郡凭引·可跨路转运' },
    national:{ label: '通国凭引', cost: 800,  minRelation: 60,  rangeBonus: 4,   desc: '通国凭引·可通行全国商道' },
    frontier:{ label: '出关凭引', cost: 1500, minRelation: 75,  rangeBonus: 6,   desc: '出关凭引·可走边塞互市' }
  };

  // 4 类路线风险事件·朝代中立
  //   bandit:    山贼劫掠（沿用 tm-coastal-raid.js 抵损模式）
  //   official:  官府盘剥（沿途关卡索贿·与官场关系反相关）
  //   weather:   气候灾害（风雨冰雪·与路线 terrain 关联）
  //   faction:   地方势力索要过路费（与商誉/势力关系反相关）
  var RISK_TYPES = {
    bandit:   { id: 'bandit',   label: '山贼劫掠', severity: 'high',   affects: 'cargo' },
    official: { id: 'official', label: '官府盘剥', severity: 'medium', affects: 'cash' },
    weather:  { id: 'weather',  label: '气候灾害', severity: 'medium', affects: 'time' },
    faction:  { id: 'faction',  label: '势力索费', severity: 'low',    affects: 'cash' }
  };

  // 默认通用路线·朝代中立（剧本可经 P.tradeRoutes 覆盖/扩展）
  //   引擎绝不预置"丝路/茶马/漕运/海贸"等朝代特定路线名
  var DEFAULT_ROUTES = [
    {
      id: 'land_generic', label: '陆路商道', terrain: 'land',
      baseDistance: 8, baseTurns: 2,
      riskProfile: { bandit: 0.30, official: 0.20, weather: 0.20, faction: 0.15 },
      goodsBias: { silk: 1.0, tea: 1.0, grain: 0.8, iron: 0.9 }
    },
    {
      id: 'water_generic', label: '水路商道', terrain: 'water',
      baseDistance: 6, baseTurns: 2,
      riskProfile: { bandit: 0.15, official: 0.15, weather: 0.35, faction: 0.10 },
      goodsBias: { grain: 1.2, salt: 1.1, fish: 1.3, silk: 1.0 }
    },
    {
      id: 'mountain_generic', label: '山道商路', terrain: 'mountain',
      baseDistance: 10, baseTurns: 3,
      riskProfile: { bandit: 0.40, official: 0.10, weather: 0.30, faction: 0.15 },
      goodsBias: { tea: 1.3, herb: 1.2, iron: 1.1, wood: 1.2 }
    }
  ];

  // 大宗贸易阈值·超此值调用 tm-region-magnate.js 影响区域经济
  var MAGNATE_TRADE_THRESHOLD = 5000;

  // 商誉阈值·开启新商业网络
  var REPUTATION_NETWORK_TIERS = [
    { rep: 30,  network: '州县商网',  desc: '本地州县商路畅通' },
    { rep: 80,  network: '跨路商网',  desc: '跨路转运商网络开启' },
    { rep: 150, network: '通国商网',  desc: '全国通行商网络开启' },
    { rep: 250, network: '海贸商网',  desc: '海贸商网络开启' }
  ];

  var REPUTATION_GAIN_PER_TRADE = 5;       // 每次成功跑商基础商誉 +5
  var REPUTATION_GAIN_LARGE_BONUS = 10;    // 大宗贸易额外 +10
  var REPUTATION_LOSS_ON_LOST = 15;        // 商队全军覆没 -15
  var CARAVAN_ID_PREFIX = 'caravan_';
  var LEDGER_MAX = 200;

  // ════════════════════════════════════════════════════════════
  //  §2 工具函数
  // ════════════════════════════════════════════════════════════

  function _isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _isStr(v) { return typeof v === 'string' && v.length > 0; }
  function _clamp(v, lo, hi) {
    v = Number(v);
    if (!isFinite(v)) v = lo;
    return Math.max(lo, Math.min(hi, v));
  }
  function _pick(arr) {
    return Array.isArray(arr) && arr.length ? arr[Math.floor(Math.random() * arr.length)] : '';
  }
  function _uid() {
    if (typeof uid === 'function') { try { return uid(); } catch (_) {} }
    return CARAVAN_ID_PREFIX + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36);
  }
  function _curTurn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }
  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _icon(name, size) {
    if (typeof tmIcon === 'function') { try { return tmIcon(name, size || 12); } catch (_) {} }
    return '';
  }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.warn('[PlayerTrade]', m); } catch (_) {}
  }
  function _addEB(cat, txt) {
    if (typeof addEB === 'function') { try { addEB(cat, txt); return; } catch (_) {} }
    try { console.log('[PlayerTrade][' + cat + ']', txt); } catch (_) {}
  }

  function _isTransmigration() {
    try {
      if (global.TM && global.TM.Transmigration &&
          typeof global.TM.Transmigration.isTransmigrationMode === 'function') {
        return !!global.TM.Transmigration.isTransmigrationMode();
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        return P.playerInfo.transmigrationMode === true;
      }
    } catch (_) {}
    return false;
  }

  function _playerName() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.characterName) {
        return P.playerInfo.characterName;
      }
    } catch (_) {}
    return '玩家';
  }

  // ── 玩家银钱账本适配器（软依赖 TM.PlayerEconomy）──
  //   优先级：TM.PlayerEconomy.getBalance / spend / addIncome（真实 API）
  //   降级 1：TM.PlayerEconomy.getCash / spendCash / addCash（spec 文案别名）
  //   降级 2：直写 P.playerInfo.money（兜底·arch-ok）
  function _getPlayerCash() {
    try {
      if (TM && TM.PlayerEconomy) {
        if (typeof TM.PlayerEconomy.getBalance === 'function') return TM.PlayerEconomy.getBalance() || 0;
        if (typeof TM.PlayerEconomy.getCash === 'function') return TM.PlayerEconomy.getCash() || 0;
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && _isNum(P.playerInfo.money)) {
        return P.playerInfo.money;
      }
    } catch (_) {}
    return 0;
  }

  function _spendPlayerCash(amount, label) {
    if (!_isNum(amount) || amount < 0) return { ok: false, reason: '金额非法' };
    try {
      if (TM && TM.PlayerEconomy) {
        if (typeof TM.PlayerEconomy.spend === 'function') {
          var r = TM.PlayerEconomy.spend(amount, label);
          if (r && r.ok) return { ok: true, cash: r.cash };
          return { ok: false, reason: r && r.reason || '银钱不足', cash: r && r.cash };
        }
        if (typeof TM.PlayerEconomy.spendCash === 'function') {
          var r2 = TM.PlayerEconomy.spendCash(amount, label);
          if (r2 && r2.ok) return { ok: true, cash: r2.cash };
          return { ok: false, reason: r2 && r2.reason || '银钱不足', cash: r2 && r2.cash };
        }
      }
    } catch (_) {}
    // 兜底·直写 P.playerInfo.money
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (typeof P.playerInfo.money !== 'number') P.playerInfo.money = 0; // arch-ok
        if (P.playerInfo.money < amount) return { ok: false, reason: '银钱不足', cash: P.playerInfo.money };
        P.playerInfo.money -= amount; // arch-ok
        return { ok: true, cash: P.playerInfo.money };
      }
    } catch (_) {}
    return { ok: false, reason: '账本未就绪' };
  }

  function _addPlayerCash(amount, source) {
    if (!_isNum(amount) || amount === 0) return { ok: true, cash: _getPlayerCash() };
    try {
      if (TM && TM.PlayerEconomy) {
        if (typeof TM.PlayerEconomy.addIncome === 'function') {
          var r = TM.PlayerEconomy.addIncome(source || 'trade', Math.abs(amount), { reason: '跑商结算' });
          if (r && r.ok) return { ok: true, cash: r.cash };
        }
        if (typeof TM.PlayerEconomy.addCash === 'function') {
          var r2 = TM.PlayerEconomy.addCash(Math.abs(amount), source || 'trade');
          if (r2 && r2.ok) return { ok: true, cash: r2.cash };
        }
      }
    } catch (_) {}
    // 兜底·直写 P.playerInfo.money
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (typeof P.playerInfo.money !== 'number') P.playerInfo.money = 0; // arch-ok
        P.playerInfo.money += amount; // arch-ok
        return { ok: true, cash: P.playerInfo.money };
      }
    } catch (_) {}
    return { ok: false, reason: '账本未就绪' };
  }

  // ── 区域商品价格矩阵查询（软依赖·多级降级）──
  //   优先级：
  //     1. 剧本 hook：P.tradePrices[region][goods]
  //     2. GM.economy.regionPrices[region][goods]
  //     3. 确定性 mock（基于 region+goods 哈希·稳定可测）
  function _getRegionPrice(region, goods) {
    if (!_isStr(region) || !_isStr(goods)) return 0;
    // 1. 剧本 hook
    try {
      if (typeof P !== 'undefined' && P && P.tradePrices && P.tradePrices[region]) {
        var v = P.tradePrices[region][goods];
        if (_isNum(v) && v > 0) return v;
      }
    } catch (_) {}
    // 2. GM.economy.regionPrices
    try {
      if (typeof GM !== 'undefined' && GM && GM.economy && GM.economy.regionPrices && GM.economy.regionPrices[region]) {
        var v2 = GM.economy.regionPrices[region][goods];
        if (_isNum(v2) && v2 > 0) return v2;
      }
    } catch (_) {}
    // 4. 确定性 mock（region+goods 哈希→50-200）
    return _mockPrice(region, goods);
  }

  function _mockPrice(region, goods) {
    var s = String(region || '') + '|' + String(goods || '');
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) & 0x0fffffff;
    return 50 + (h % 151); // 50-200
  }

  // ── 官场关系查询（许可难度关联·软依赖 TM.PlayerInteraction）──
  function _getOfficialRelation() {
    try {
      if (TM && TM.PlayerInteraction && typeof TM.PlayerInteraction.getOfficialRelation === 'function') {
        var v = TM.PlayerInteraction.getOfficialRelation();
        if (_isNum(v)) return v;
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && _isNum(P.playerInfo.officialRelation)) {
        return P.playerInfo.officialRelation;
      }
    } catch (_) {}
    // 品级反推：rankLevel 1=最高→100, 18=最低→10
    try {
      if (typeof GM !== 'undefined' && GM && Array.isArray(GM.chars)) {
        var name = _playerName();
        for (var i = 0; i < GM.chars.length; i++) {
          var c = GM.chars[i];
          if (c && c.name === name && _isNum(c.rankLevel)) {
            return _clamp(100 - (c.rankLevel - 1) * 5, 0, 100);
          }
        }
      }
    } catch (_) {}
    return 30; // 默认中等关系
  }

  // ── LLM 调用（与 tm-sovereign-ai.js / tm-player-interaction.js 一致）──
  //   绝不使用 TM.LLM.call 等编造命名空间（lint-dep-graph 会抓悬空引用）
  function _callLLM(prompt) {
    // 1) global.callAI（主路径）
    try {
      if (typeof global.callAI === 'function') return global.callAI(prompt);
    } catch (_) {}
    // 2) 全局 callLLM
    try {
      if (typeof callLLM === 'function') return callLLM(prompt);
    } catch (_) {}
    // 3) 降级·返回 null（由 _generateScene 兜底）
    return null;
  }

  function _generateScene(caravan, kind, payload) {
    var pName = _playerName();
    var from = (caravan.route && caravan.route.from) || '○';
    var to = (caravan.route && caravan.route.to) || '○';
    var goodsList = (caravan.goods || []).map(function (g) { return g.name + '×' + (g.qty || 0); }).join('、') || '杂货';
    var guardStr = (caravan.guards || 0) + '名护卫·' + (caravan.carts || 0) + '辆大车';

    var prompt = [
      '【玩家跑商·场景生成】',
      '玩家：' + pName,
      '商队：自 ' + from + ' 至 ' + to,
      '货物：' + goodsList,
      '配置：' + guardStr,
      '事件：' + (kind || '派遣'),
      payload && payload.note ? '备注：' + payload.note : '',
      '请基于路线、货物、配置，生成一段 60-120 字的跑商场景描述（朝代中立·不挂任何朝代专属建制名）。'
    ].filter(Boolean).join('\n');

    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string' && llm.trim()) return llm.trim();

    // 降级·确定性 mock（不依赖 LLM）
    if (kind === 'dispatch') {
      return pName + '遣商队自' + from + '赴' + to + '·载' + goodsList + '·' + guardStr + '·启程上路。';
    }
    if (kind === 'arrive') {
      return '商队跋涉多日·终抵' + to + '·就地发卖·清点货账。';
    }
    if (kind === 'lost') {
      return '商队途中遇变·折损大半·残部空手而归。';
    }
    return pName + '商队行' + from + '至' + to + '之事。';
  }

  // ════════════════════════════════════════════════════════════
  //  §3 状态读写（玩家商队账本挂在 GM._playerTrade）
  // ════════════════════════════════════════════════════════════

  function _defaultState() {
    return {
      caravans: [],
      reputation: 0,
      networks: [],
      ledger: [],
      stats: { totalTrades: 0, totalProfit: 0, totalLoss: 0, lostCount: 0 }
    };
  }

  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerTrade) {
        GM._playerTrade = _defaultState(); // arch-ok (玩家商队账本初始化)
      }
      return GM._playerTrade;
    } catch (_) { return null; }
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (!Array.isArray(s.caravans)) s.caravans = []; // arch-ok
    if (!Array.isArray(s.networks)) s.networks = []; // arch-ok
    if (!Array.isArray(s.ledger)) s.ledger = []; // arch-ok
    if (typeof s.reputation !== 'number') s.reputation = 0; // arch-ok
    if (!s.stats || typeof s.stats !== 'object') s.stats = { totalTrades: 0, totalProfit: 0, totalLoss: 0, lostCount: 0 }; // arch-ok
    return s;
  }

  function _pushLedger(s, kind, delta, reason) {
    s.ledger.push({ // arch-ok
      id: _uid(),
      turn: _curTurn(),
      kind: kind,
      delta: delta,
      reason: reason || '',
      at: (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0
    });
    if (s.ledger.length > LEDGER_MAX) s.ledger = s.ledger.slice(-LEDGER_MAX); // arch-ok
  }

  // ════════════════════════════════════════════════════════════
  //  §4 路线管理（SubTask 17.8·跨朝代通用·剧本 hook）
  // ════════════════════════════════════════════════════════════

  // listRoutes() → 数组
  //   优先级：剧本 hook P.tradeRoutes（含朝代专属路线如丝路/茶马/漕运/海贸）
  //   降级：DEFAULT_ROUTES（朝代中立通用框架）
  function listRoutes() {
    try {
      if (typeof P !== 'undefined' && P && Array.isArray(P.tradeRoutes) && P.tradeRoutes.length > 0) {
        return P.tradeRoutes.slice();
      }
    } catch (_) {}
    return DEFAULT_ROUTES.slice();
  }

  function getRoute(routeId) {
    if (!_isStr(routeId)) return null;
    var routes = listRoutes();
    for (var i = 0; i < routes.length; i++) {
      if (routes[i] && routes[i].id === routeId) return routes[i];
    }
    return null;
  }

  // 解析路线（支持 routeId 或 route 对象·降级到默认）
  function _resolveRoute(routeSpec) {
    if (!routeSpec) return DEFAULT_ROUTES[0];
    if (typeof routeSpec === 'string') return getRoute(routeSpec) || DEFAULT_ROUTES[0];
    if (typeof routeSpec === 'object' && routeSpec.id) return routeSpec;
    return DEFAULT_ROUTES[0];
  }

  // ════════════════════════════════════════════════════════════
  //  §5 组建商队（SubTask 17.3）
  // ════════════════════════════════════════════════════════════

  // createCaravan(opts) → { ok, caravan, cost, permit, reason }
  //   opts: {
  //     routeId: 'land_generic',           // 路线 id（必填·可由剧本提供）
  //     from: '洛阳', to: '长安',          // 起点/终点（必填）
  //     goods: [{name:'silk', qty:10, buyPrice:80}],  // 货物清单（必填·qty>0）
  //     guards: 5,                         // 护卫人数（默认 0·影响山贼风险）
  //     carts: 2,                          // 车马数（默认 1·影响运力上限）
  //     permit: 'regional'                 // 通关凭引等级（默认 'local'）
  //   }
  //   消耗：组建成本（含凭引费 + 护卫雇金 + 车马费）+ 货物采购费
  //   守卫：非穿越模式 / 路线未知 / 起终点缺失 / 货物非法 / 银钱不足 / 凭引关系不够 各拒
  function createCaravan(opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '商队账本未就绪' };

    if (!_isStr(opts.from) || !_isStr(opts.to)) return { ok: false, reason: '须指定起点与终点' };
    if (opts.from === opts.to) return { ok: false, reason: '起点与终点不可相同' };

    var route = _resolveRoute(opts.routeId);
    if (!route) return { ok: false, reason: '路线未知' };

    // 货物清单
    if (!Array.isArray(opts.goods) || opts.goods.length === 0) {
      return { ok: false, reason: '须至少一种货物' };
    }
    var goods = [];
    var purchaseCost = 0;
    for (var i = 0; i < opts.goods.length; i++) {
      var g = opts.goods[i];
      if (!g || !_isStr(g.name) || !_isNum(g.qty) || g.qty <= 0) {
        return { ok: false, reason: '货物清单含非法项' };
      }
      var bp = _isNum(g.buyPrice) && g.buyPrice > 0 ? g.buyPrice : _getRegionPrice(opts.from, g.name);
      goods.push({ name: g.name, qty: g.qty, buyPrice: bp });
      purchaseCost += bp * g.qty;
    }

    // 运力上限校验：每车运力 10 单位
    var carts = _isNum(opts.carts) && opts.carts > 0 ? Math.floor(opts.carts) : 1;
    var totalQty = 0;
    goods.forEach(function (g) { totalQty += g.qty; });
    if (totalQty > carts * 10) {
      return { ok: false, reason: '货物超过车马运力（每车 10 单位）·需 ' + Math.ceil(totalQty / 10) + ' 车' };
    }

    // 护卫人数（默认 0）
    var guards = _isNum(opts.guards) && opts.guards >= 0 ? Math.floor(opts.guards) : 0;

    // 通关凭引等级（默认 'local'）
    var permitLevel = PERMIT_LEVELS[opts.permit] ? opts.permit : 'local';
    var permitSpec = PERMIT_LEVELS[permitLevel];

    // 凭引官场关系校验（许可难度关联官场关系）
    var relation = _getOfficialRelation();
    if (relation < permitSpec.minRelation) {
      return {
        ok: false, reason: '官场关系不足·无法申领' + permitSpec.label +
                           '（需 ' + permitSpec.minRelation + '·当前 ' + relation + '）',
        code: 'permit-denied', relation: relation, requireRelation: permitSpec.minRelation
      };
    }

    // 组建成本：凭引费 + 护卫雇金（每人 20） + 车马费（每车 50） + 采购费
    var permitCost = permitSpec.cost;
    var guardCost = guards * 20;
    var cartCost = carts * 50;
    var setupCost = permitCost + guardCost + cartCost;
    var totalCost = setupCost + purchaseCost;

    // 银钱扣除
    var spendRes = _spendPlayerCash(totalCost, '组建商队·' + opts.from + '→' + opts.to);
    if (!spendRes.ok) {
      return {
        ok: false, reason: '银钱不足·需 ' + totalCost + '（' + spendRes.reason + '）',
        code: 'insufficient-funds', cost: totalCost, cash: spendRes.cash
      };
    }

    // 写入商队账本
    var caravan = {
      id: _uid(),
      owner: _playerName(),
      route: { from: opts.from, to: opts.to, routeId: route.id, terrain: route.terrain },
      goods: goods,
      guards: guards,
      carts: carts,
      permit: permitLevel,
      permitLabel: permitSpec.label,
      status: CARAVAN_STATUS.FORMING,
      createdAt: _curTurn(),
      dispatchedAt: null,
      arrivedAt: null,
      settledAt: null,
      setupCost: setupCost,
      purchaseCost: purchaseCost,
      totalCost: totalCost,
      expectedProfit: null,
      actualProfit: null,
      events: [],
      arrivalTurns: null,
      progress: 0
    };
    s.caravans.push(caravan); // arch-ok

    _pushLedger(s, 'caravan:create', -totalCost, '组建商队·' + opts.from + '→' + opts.to);

    _addEB('跑商', _playerName() + ' 组建商队·' + opts.from + '→' + opts.to +
                   '·货物 ' + goods.length + ' 种/' + totalQty + ' 单位' +
                   '·护卫 ' + guards + '·车 ' + carts + '·凭引「' + permitSpec.label + '」' +
                   '·共费 ' + totalCost + ' 两');

    return {
      ok: true,
      caravan: caravan,
      cost: { permit: permitCost, guards: guardCost, carts: cartCost, purchase: purchaseCost, total: totalCost },
      permit: { level: permitLevel, label: permitSpec.label, relation: relation },
      cash: spendRes.cash
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §6 派遣贸易（SubTask 17.4·预期利润计算）
  // ════════════════════════════════════════════════════════════

  // estimateProfit(caravanId or opts) → { ok, expectedProfit, breakdown, reason }
  //   根据 tm-economy-engine.js 区域价格矩阵计算预期利润
  //   预期利润 = Σ(终点售价 × qty) - 采购成本 - 运输成本 - 预期风险损失
  function estimateProfit(caravanId, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '商队账本未就绪' };

    var caravan = _findCaravan(s, caravanId);
    if (!caravan) {
      // 也支持直接传 opts 对象做 dry-run 估算
      if (typeof caravanId === 'object' && caravanId) {
        return _estimateProfitForSpec(caravanId, opts);
      }
      return { ok: false, reason: '未找到商队: ' + caravanId };
    }
    return _estimateProfitForCaravan(caravan, opts);
  }

  function _estimateProfitForCaravan(caravan, opts) {
    var route = _resolveRoute(caravan.route.routeId);
    var breakdown = [];
    var grossRevenue = 0;
    for (var i = 0; i < caravan.goods.length; i++) {
      var g = caravan.goods[i];
      var sellPrice = _getRegionPrice(caravan.route.to, g.name);
      // 路线货物偏向加成
      var bias = 1.0;
      if (route.goodsBias && _isNum(route.goodsBias[g.name])) bias = route.goodsBias[g.name];
      var adjusted = Math.round(sellPrice * bias);
      var lineRevenue = adjusted * g.qty;
      var lineCost = g.buyPrice * g.qty;
      grossRevenue += lineRevenue;
      breakdown.push({
        goods: g.name, qty: g.qty,
        buyPrice: g.buyPrice, sellPrice: adjusted,
        revenue: lineRevenue, cost: lineCost, profit: lineRevenue - lineCost
      });
    }

    var purchaseCost = caravan.purchaseCost || 0;
    var transportCost = (caravan.guards * 20) + (caravan.carts * 50); // 单程·往返已计在 setupCost
    // 预期风险损失（按路线 riskProfile 与护卫数估算）
    var expectedRiskLoss = _estimateRiskLoss(caravan, route);
    var expectedProfit = grossRevenue - purchaseCost - transportCost - expectedRiskLoss;

    return {
      ok: true,
      grossRevenue: grossRevenue,
      purchaseCost: purchaseCost,
      transportCost: transportCost,
      expectedRiskLoss: expectedRiskLoss,
      expectedProfit: expectedProfit,
      breakdown: breakdown,
      route: { id: route.id, label: route.label, terrain: route.terrain }
    };
  }

  function _estimateProfitForSpec(spec, opts) {
    if (!_isStr(spec.from) || !_isStr(spec.to)) return { ok: false, reason: '须指定起点与终点' };
    if (!Array.isArray(spec.goods) || spec.goods.length === 0) return { ok: false, reason: '须至少一种货物' };
    var route = _resolveRoute(spec.routeId);
    var breakdown = [];
    var grossRevenue = 0;
    var purchaseCost = 0;
    for (var i = 0; i < spec.goods.length; i++) {
      var g = spec.goods[i];
      var bp = (_isNum(g.buyPrice) && g.buyPrice > 0) ? g.buyPrice : _getRegionPrice(spec.from, g.name);
      var sp = _getRegionPrice(spec.to, g.name);
      var bias = 1.0;
      if (route.goodsBias && _isNum(route.goodsBias[g.name])) bias = route.goodsBias[g.name];
      var adjusted = Math.round(sp * bias);
      grossRevenue += adjusted * g.qty;
      purchaseCost += bp * g.qty;
      breakdown.push({ goods: g.name, qty: g.qty, buyPrice: bp, sellPrice: adjusted,
                       revenue: adjusted * g.qty, cost: bp * g.qty, profit: adjusted * g.qty - bp * g.qty });
    }
    var guards = _isNum(spec.guards) ? spec.guards : 0;
    var carts = _isNum(spec.carts) ? spec.carts : 1;
    var transportCost = guards * 20 + carts * 50;
    var mockCaravan = { goods: spec.goods, guards: guards, carts: carts, route: { routeId: route.id, from: spec.from, to: spec.to } };
    var expectedRiskLoss = _estimateRiskLoss(mockCaravan, route);
    return {
      ok: true,
      grossRevenue: grossRevenue,
      purchaseCost: purchaseCost,
      transportCost: transportCost,
      expectedRiskLoss: expectedRiskLoss,
      expectedProfit: grossRevenue - purchaseCost - transportCost - expectedRiskLoss,
      breakdown: breakdown,
      route: { id: route.id, label: route.label, terrain: route.terrain }
    };
  }

  // 预期风险损失估算（不实际触发·只算预期值）
  function _estimateRiskLoss(caravan, route) {
    var rp = (route && route.riskProfile) || {};
    var cargoValue = 0;
    for (var i = 0; i < (caravan.goods || []).length; i++) {
      var g = caravan.goods[i];
      cargoValue += (g.buyPrice || 0) * (g.qty || 0);
    }
    // 山贼：基础损失 = cargoValue × bandit概率 × (1 - 护卫抵扣)
    //   护卫抵扣：每 5 护卫抵 20% 山贼损失·封顶 80%
    var guardMitigate = Math.min(0.8, Math.floor((caravan.guards || 0) / 5) * 0.2);
    var banditLoss = cargoValue * (rp.bandit || 0) * (1 - guardMitigate) * 0.5;
    // 官府盘剥：现金损失（与凭引等级反相关·凭引越高·盘剥越少）
    var permitMitigate = _permitMitigate(caravan.permit);
    var officialLoss = cargoValue * (rp.official || 0) * (1 - permitMitigate) * 0.1;
    // 气候灾害：货物损耗 5%
    var weatherLoss = cargoValue * (rp.weather || 0) * 0.05;
    // 势力索费：现金损失（与商誉反相关）
    var rep = _getReputation();
    var factionMitigate = Math.min(0.8, rep / 300);
    var factionLoss = cargoValue * (rp.faction || 0) * (1 - factionMitigate) * 0.08;

    return Math.round(banditLoss + officialLoss + weatherLoss + factionLoss);
  }

  function _permitMitigate(permitLevel) {
    var levels = ['none', 'local', 'regional', 'national', 'frontier'];
    var idx = levels.indexOf(permitLevel);
    if (idx < 0) idx = 1;
    // none→0, local→0.2, regional→0.4, national→0.6, frontier→0.8
    return idx * 0.2;
  }

  // dispatchTrade(caravanId, opts) → { ok, status, eta, expectedProfit, scene, reason }
  function dispatchTrade(caravanId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '商队账本未就绪' };

    var caravan = _findCaravan(s, caravanId);
    if (!caravan) return { ok: false, reason: '未找到商队: ' + caravanId };
    if (caravan.status !== CARAVAN_STATUS.FORMING) {
      return { ok: false, reason: '商队当前状态不可派遣: ' + caravan.status };
    }

    var route = _resolveRoute(caravan.route.routeId);

    // 估算预期利润
    var profitEst = _estimateProfitForCaravan(caravan, opts);
    caravan.expectedProfit = profitEst.expectedProfit; // arch-ok

    // 计算运输耗时（凭引等级加成·减少关卡盘查时间）
    var permitSpec = PERMIT_LEVELS[caravan.permit] || PERMIT_LEVELS.local;
    var turns = route.baseTurns || 2;
    turns = Math.max(1, turns - Math.floor(permitSpec.rangeBonus / 2));
    caravan.arrivalTurns = turns; // arch-ok
    caravan.progress = 0; // arch-ok
    caravan.dispatchedAt = _curTurn(); // arch-ok
    caravan.status = CARAVAN_STATUS.DISPATCHED; // arch-ok

    // 场景描述（LLM 优先·降级 mock）
    var scene = _generateScene(caravan, 'dispatch', { note: opts.note || '' });

    _pushLedger(s, 'caravan:dispatch', 0, '派遣商队·' + caravan.route.from + '→' + caravan.route.to +
                                          '·预期利润 ' + profitEst.expectedProfit);

    _addEB('跑商', '商队启程·' + caravan.route.from + '→' + caravan.route.to +
                   '·预期利润 ' + profitEst.expectedProfit + '·预计 ' + turns + ' 回合抵达');

    return {
      ok: true,
      status: caravan.status,
      caravanId: caravan.id,
      eta: _curTurn() + turns,
      turns: turns,
      expectedProfit: profitEst.expectedProfit,
      breakdown: profitEst.breakdown,
      scene: scene,
      cash: _getPlayerCash()
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §7 路线风险事件（SubTask 17.5·4 类风险）
  // ════════════════════════════════════════════════════════════

  // triggerRiskEvent(caravanId or caravan, opts) → { type, title, text, effect, source }
  //   opts.forceType: 强制触发某类风险（'bandit'|'official'|'weather'|'faction'）
  //   opts.forceRoll: 强制概率值（0-1·用于 smoke 测试可重现）
  //   沿用 tm-coastal-raid.js 模式：概率触发 + 抵损公式（非 AI 裁定）
  function triggerRiskEvent(caravanId, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return null;
    var caravan = (typeof caravanId === 'object' && caravanId) ? caravanId : _findCaravan(s, caravanId);
    if (!caravan) return null;

    var route = _resolveRoute(caravan.route.routeId);
    var rp = (route && route.riskProfile) || { bandit: 0.3, official: 0.2, weather: 0.2, faction: 0.15 };

    var type = opts.forceType || _pickRiskType(rp, opts.forceRoll);
    if (!RISK_TYPES[type]) type = 'bandit';

    var title = RISK_TYPES[type].label;
    var effect = _computeRiskEffect(type, caravan, route, opts);
    var text = _generateRiskText(type, caravan, effect, opts);

    var evt = {
      id: _uid(),
      type: type,
      title: title,
      text: text,
      effect: effect,
      turn: _curTurn(),
      source: opts.forceType ? 'forced' : 'random'
    };

    if (!Array.isArray(caravan.events)) caravan.events = []; // arch-ok
    caravan.events.push(evt); // arch-ok

    return evt;
  }

  function _pickRiskType(rp, forceRoll) {
    var total = (rp.bandit || 0) + (rp.official || 0) + (rp.weather || 0) + (rp.faction || 0);
    if (total <= 0) return null;
    var r = (_isNum(forceRoll) ? forceRoll : Math.random()) * total;
    var acc = 0;
    acc += (rp.bandit || 0);   if (r < acc) return 'bandit';
    acc += (rp.official || 0); if (r < acc) return 'official';
    acc += (rp.weather || 0);  if (r < acc) return 'weather';
    return 'faction';
  }

  function _computeRiskEffect(type, caravan, route, opts) {
    var cargoValue = 0;
    var totalQty = 0;
    for (var i = 0; i < (caravan.goods || []).length; i++) {
      var g = caravan.goods[i];
      cargoValue += (g.buyPrice || 0) * (g.qty || 0);
      totalQty += (g.qty || 0);
    }

    switch (type) {
      case 'bandit': {
        // 山贼劫掠：护卫抵扣（每 5 护卫抵 20%·封顶 80%）
        //   沿用 tm-coastal-raid.js 抵损模式：coastalDef × 0.15 → guards × 0.04
        var guardMitigate = Math.min(0.8, Math.floor((caravan.guards || 0) / 5) * 0.2);
        // 损失 = 货物价值 × 劫掠比例 × (1 - 抵扣)
        var lootRatio = 0.3 + Math.random() * 0.3; // 30%-60% 货物被劫
        var actualLoot = lootRatio * (1 - guardMitigate);
        var cargoLoss = Math.round(cargoValue * actualLoot);
        // 护卫伤亡
        var guardCasualty = Math.min(caravan.guards || 0, Math.floor(Math.random() * 3));
        return {
          cargoLoss: cargoLoss,
          cargoLossRatio: actualLoot,
          guardCasualty: guardCasualty,
          guardMitigate: guardMitigate,
          note: guardMitigate > 0.4 ? '护卫得力·击退山贼' : '山贼劫掠·折损货物'
        };
      }
      case 'official': {
        // 官府盘剥：凭引抵扣（凭引越高·盘剥越少）
        var permitMitigate = _permitMitigate(caravan.permit);
        var baseExtortion = cargoValue * 0.08;
        var actualExtortion = Math.round(baseExtortion * (1 - permitMitigate));
        return {
          cashLoss: actualExtortion,
          permitMitigate: permitMitigate,
          note: permitMitigate > 0.4 ? '凭引通衢·关卡放行' : '关卡盘剥·纳银通融'
        };
      }
      case 'weather': {
        // 气候灾害：货物损耗 + 耽误时日
        var spoilRatio = 0.05 + Math.random() * 0.15; // 5%-20% 货物损耗
        var spoilQty = Math.max(1, Math.floor(totalQty * spoilRatio));
        var spoilLoss = Math.round(cargoValue * spoilRatio);
        var delayTurns = 1;
        return {
          spoilLoss: spoilLoss,
          spoilQty: spoilQty,
          delayTurns: delayTurns,
          note: '风雨不时·货物受潮·耽误时日'
        };
      }
      case 'faction': {
        // 地方势力索要过路费：商誉抵扣（商誉越高·过路费越少）
        var rep = _getReputation();
        var repMitigate = Math.min(0.8, rep / 300);
        var baseToll = cargoValue * 0.05;
        var actualToll = Math.round(baseToll * (1 - repMitigate));
        return {
          cashLoss: actualToll,
          repMitigate: repMitigate,
          note: repMitigate > 0.4 ? '商誉卓著·势力放行' : '地方势力索要过路费'
        };
      }
      default:
        return { note: '路上无事' };
    }
  }

  function _generateRiskText(type, caravan, effect, opts) {
    var prompt = [
      '【玩家跑商·路线风险事件】',
      '风险类型：' + RISK_TYPES[type].label,
      '路线：' + (caravan.route.from || '○') + ' → ' + (caravan.route.to || '○'),
      '护卫：' + (caravan.guards || 0) + ' 名',
      '凭引：' + (caravan.permitLabel || caravan.permit || ''),
      '后果：' + (effect.note || ''),
      '请用 60-100 字描述此风险事件场景（朝代中立·不挂任何朝代专属建制名）。'
    ].join('\n');
    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string' && llm.trim()) return llm.trim();
    // 降级 mock
    var templates = {
      bandit: [
        '山道之上忽有贼人拦路·' + (effect.guardMitigate > 0.4 ? '护卫拼死击退' : '货物被劫去大半') + '。',
        '林间窜出剪径贼·' + (caravan.guards > 0 ? '护卫力战·仍折损若干' : '无人护卫·损失惨重') + '。',
        '夜宿荒村遇盗·连夜追之不及·失货若干。'
      ],
      official: [
        '途经关卡·官吏盘查索银·' + (effect.permitMitigate > 0.4 ? '凭引通衢·纳银少许即放行' : '纳银通融·方得过关') + '。',
        '州县官吏借故刁难·索银若干·方许通行。',
        '关卡盘剥·虽不至伤筋动骨·亦费银钱。'
      ],
      weather: [
        '途中骤雨倾盆·避雨半日·' + (effect.spoilQty > 0 ? '部分货物受潮损耗' : '幸无大碍') + '。',
        '风雪交加·路阻山中·耽搁' + (effect.delayTurns || 1) + '日方行。',
        '江风骤起·舟船不得渡·候风三日始行·货物略有损耗。'
      ],
      faction: [
        '途经地方势力辖地·索要过路费·' + (effect.repMitigate > 0.4 ? '念商誉卓著·纳银少许即放行' : '纳银通融·方得过境') + '。',
        '地方豪强拦路设卡·索银若干·方许通行。',
        '草莽势力盘踞要道·纳过路费方得安然通过。'
      ]
    };
    return _pick(templates[type] || templates.bandit);
  }

  // ════════════════════════════════════════════════════════════
  //  §8 推进商队 + 到达结算（SubTask 17.6）
  // ════════════════════════════════════════════════════════════

  // advanceCaravan(caravanId) → { ok, status, progress, events, arrived, settlement }
  //   每回合调用·推进 1 单位进度·按概率触发风险事件·达 totalTurns 时到达
  function advanceCaravan(caravanId) {
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '商队账本未就绪' };
    var caravan = _findCaravan(s, caravanId);
    if (!caravan) return { ok: false, reason: '未找到商队: ' + caravanId };
    if (caravan.status !== CARAVAN_STATUS.DISPATCHED) {
      return { ok: false, reason: '商队未在派遣中·当前: ' + caravan.status };
    }

    caravan.progress = (caravan.progress || 0) + 1; // arch-ok

    // 风险事件触发：每回合 35% 概率（可被剧本覆盖）
    var riskChance = 0.35;
    try {
      if (typeof P !== 'undefined' && P && _isNum(P.tradeRiskChance)) riskChance = P.tradeRiskChance;
    } catch (_) {}
    var evt = null;
    if (Math.random() < riskChance) {
      evt = triggerRiskEvent(caravan, {});
    }

    // 到达判定
    if (caravan.progress >= (caravan.arrivalTurns || 2)) {
      caravan.status = CARAVAN_STATUS.ARRIVED; // arch-ok
      caravan.arrivedAt = _curTurn(); // arch-ok
      var settlement = settleArrival(caravan.id);
      return {
        ok: true,
        status: caravan.status,
        progress: caravan.progress,
        totalTurns: caravan.arrivalTurns,
        event: evt,
        arrived: true,
        settlement: settlement
      };
    }

    return {
      ok: true,
      status: caravan.status,
      progress: caravan.progress,
      totalTurns: caravan.arrivalTurns,
      remaining: caravan.arrivalTurns - caravan.progress,
      event: evt,
      arrived: false
    };
  }

  // settleArrival(caravanId) → { ok, settlement, cash, reason }
  //   商队到达后结算实际盈亏·写入玩家银钱账本
  //   实际利润 = Σ(终点售价 × 剩余qty) - 采购成本 - 风险损失
  function settleArrival(caravanId) {
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '商队账本未就绪' };
    var caravan = _findCaravan(s, caravanId);
    if (!caravan) return { ok: false, reason: '未找到商队: ' + caravanId };
    if (caravan.status !== CARAVAN_STATUS.ARRIVED) {
      return { ok: false, reason: '商队未到达·当前: ' + caravan.status };
    }

    var route = _resolveRoute(caravan.route.routeId);

    // 累计风险损失
    var totalCargoLoss = 0;
    var totalCashLoss = 0;
    var totalSpoilQty = 0;
    var totalGuardCasualty = 0;
    var delayTurns = 0;
    (caravan.events || []).forEach(function (e) {
      if (!e || !e.effect) return;
      totalCargoLoss += e.effect.cargoLoss || 0;
      totalCashLoss += e.effect.cashLoss || 0;
      totalSpoilQty += e.effect.spoilQty || 0;
      totalGuardCasualty += e.effect.guardCasualty || 0;
      delayTurns += e.effect.delayTurns || 0;
    });

    // 货物按风险损耗后剩余量卖出
    var goodsSold = [];
    var grossRevenue = 0;
    var spoilLossValue = 0;
    for (var i = 0; i < caravan.goods.length; i++) {
      var g = caravan.goods[i];
      // 按比例扣减损耗货物
      var spoilRatio = totalCargoLoss > 0 && caravan.purchaseCost > 0
        ? Math.min(1, totalCargoLoss / caravan.purchaseCost)
        : 0;
      var remainingQty = Math.max(0, g.qty - Math.round(g.qty * spoilRatio));
      // 单独扣减气候损耗量
      if (totalSpoilQty > 0) {
        var qtySpoilRatio = Math.min(1, totalSpoilQty / Math.max(1, g.qty));
        remainingQty = Math.max(0, remainingQty - Math.round(g.qty * qtySpoilRatio));
      }
      var sp = _getRegionPrice(caravan.route.to, g.name);
      var bias = 1.0;
      if (route.goodsBias && _isNum(route.goodsBias[g.name])) bias = route.goodsBias[g.name];
      var adjusted = Math.round(sp * bias);
      var lineRevenue = adjusted * remainingQty;
      grossRevenue += lineRevenue;
      var lostQty = g.qty - remainingQty;
      spoilLossValue += g.buyPrice * lostQty;
      goodsSold.push({ name: g.name, origQty: g.qty, soldQty: remainingQty, lostQty: lostQty,
                       sellPrice: adjusted, revenue: lineRevenue });
    }

    // 实际盈亏 = 毛收入 - 现金损失（盘剥/过路费） - 采购成本 - 组建成本
    //   注：组建成本（凭引/护卫/车马）已在 createCaravan 时扣除·此处不重复
    var netCashGain = grossRevenue - totalCashLoss;
    var totalInvested = caravan.totalCost || 0;
    var actualProfit = netCashGain - totalInvested;

    // 写入玩家银钱账本：卖出收入入账
    var addRes = _addPlayerCash(netCashGain, 'trade:settle');

    // 商队状态更新
    caravan.status = CARAVAN_STATUS.SETTLED; // arch-ok
    caravan.settledAt = _curTurn(); // arch-ok
    caravan.actualProfit = actualProfit; // arch-ok
    caravan.settlement = { // arch-ok
      grossRevenue: grossRevenue,
      cashLoss: totalCashLoss,
      cargoLoss: totalCargoLoss,
      spoilLossValue: spoilLossValue,
      guardCasualty: totalGuardCasualty,
      delayTurns: delayTurns,
      netCashGain: netCashGain,
      actualProfit: actualProfit,
      goodsSold: goodsSold,
      events: (caravan.events || []).slice()
    };

    // 统计
    s.stats.totalTrades += 1; // arch-ok
    if (actualProfit >= 0) {
      s.stats.totalProfit += actualProfit; // arch-ok
    } else {
      s.stats.totalLoss += Math.abs(actualProfit); // arch-ok
    }

    _pushLedger(s, 'caravan:settle', netCashGain,
                '商队结算·' + caravan.route.from + '→' + caravan.route.to +
                '·毛入 ' + grossRevenue + '·净盈亏 ' + actualProfit);

    // SubTask 17.7: 大宗贸易（超阈值）调用 tm-region-magnate.js
    var magnateImpact = null;
    if (grossRevenue >= MAGNATE_TRADE_THRESHOLD) {
      magnateImpact = _applyMagnateImpact(caravan, grossRevenue);
    }

    // SubTask 17.9: 跑商积累商誉
    var repGain = REPUTATION_GAIN_PER_TRADE;
    if (grossRevenue >= MAGNATE_TRADE_THRESHOLD) repGain += REPUTATION_GAIN_LARGE_BONUS;
    var repRes = _applyReputationGain(repGain, caravan);

    // LLM 场景描述
    var scene = _generateScene(caravan, 'arrive', { note: '净盈亏 ' + actualProfit });

    _addEB('跑商', '商队抵' + caravan.route.to + '·毛入 ' + grossRevenue +
                   (totalCashLoss > 0 ? '·路损 ' + totalCashLoss : '') +
                   '·净盈亏 ' + actualProfit +
                   (magnateImpact ? '·大宗贸易影响区域经济' : '') +
                   '·商誉 +' + repGain);

    return {
      ok: true,
      caravanId: caravan.id,
      settlement: caravan.settlement,
      actualProfit: actualProfit,
      cash: addRes.ok ? addRes.cash : _getPlayerCash(),
      magnateImpact: magnateImpact,
      reputation: repRes,
      scene: scene
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §9 大宗贸易影响区域经济（SubTask 17.7·调用 tm-region-magnate.js）
  // ════════════════════════════════════════════════════════════

  // _applyMagnateImpact(caravan, grossRevenue) → { ok, region, magnatePowerBefore, magnatePowerAfter, source }
  //   软依赖 tm-region-magnate.js：
  //     1. 主路径：直调 _tickProvinceMagnate（tm-region-magnate.js 顶层导出）
  //     2. 降级：直写 GM.adminHierarchy[toRegion].magnatePower（arch-ok）
  //     3. 最终降级：仅记录事件栏（addEB）·不写 GM
  function _applyMagnateImpact(caravan, grossRevenue) {
    var region = caravan.route.to;
    var province = _findProvince(region);
    var before = (province && _isNum(province.magnatePower)) ? province.magnatePower : null;
    var delta = Math.min(8, Math.max(1, Math.floor(grossRevenue / MAGNATE_TRADE_THRESHOLD)));

    // 1. 主路径·直调 _tickProvinceMagnate（拉动一次 magnate tick）
    try {
      if (typeof _tickProvinceMagnate === 'function' && province) {
        _tickProvinceMagnate(province, { GM: (typeof GM !== 'undefined' ? GM : null) });
        return { ok: true, region: region, delta: delta, source: 'tickProvinceMagnate',
                 magnatePowerBefore: before, magnatePowerAfter: province.magnatePower };
      }
      // module exports 形态
      var mod = (typeof require === 'function') ? null : null;
      // 在浏览器/VM 中·_tickProvinceMagnate 是 window 全局；smoke 中可能由 mock 提供
    } catch (_) {}

    // 3. 降级·直写 GM.adminHierarchy[toRegion].magnatePower（arch-ok）
    try {
      if (province) {
        if (typeof province.magnatePower !== 'number') province.magnatePower = 12; // arch-ok
        province.magnatePower = _clamp(province.magnatePower + delta, 0, 100); // arch-ok
        // 大宗贸易也小幅提升当地 commerceVolume（arch-ok·玩家商队为当地带来商业活力）
        if (province.economyBase && typeof province.economyBase === 'object') {
          var cv = Number(province.economyBase.commerceVolume) || 0;
          province.economyBase.commerceVolume = cv + Math.round(grossRevenue * 0.1); // arch-ok
        }
        return { ok: true, region: region, delta: delta, source: 'direct-write',
                 magnatePowerBefore: before, magnatePowerAfter: province.magnatePower };
      }
    } catch (_) {}

    // 4. 降级·仅事件栏
    _addEB('跑商', '大宗贸易·' + caravan.route.from + '→' + region +
                   '·毛入 ' + grossRevenue + '·影响区域经济（引擎未就绪·仅记录）');
    return { ok: false, region: region, delta: delta, source: 'event-only',
             magnatePowerBefore: before, magnatePowerAfter: null,
             reason: 'tm-region-magnate.js 与 GM.adminHierarchy 均不可用' };
  }

  function _findProvince(regionName) {
    if (!_isStr(regionName)) return null;
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      // 优先：adminHierarchy 平铺
      if (GM.adminHierarchy && typeof GM.adminHierarchy === 'object') {
        if (GM.adminHierarchy[regionName]) return GM.adminHierarchy[regionName];
        // 深搜
        for (var k in GM.adminHierarchy) {
          if (!Object.prototype.hasOwnProperty.call(GM.adminHierarchy, k)) continue;
          var v = GM.adminHierarchy[k];
          if (v && typeof v === 'object') {
            if (v.name === regionName || v.id === regionName) return v;
            // 嵌套 leaves
            if (Array.isArray(v.leaves)) {
              for (var i = 0; i < v.leaves.length; i++) {
                if (v.leaves[i] && (v.leaves[i].name === regionName || v.leaves[i].id === regionName)) {
                  return v.leaves[i];
                }
              }
            }
          }
        }
      }
      // 降级：provinces 数组
      if (Array.isArray(GM.provinces)) {
        for (var j = 0; j < GM.provinces.length; j++) {
          var p = GM.provinces[j];
          if (p && (p.name === regionName || p.id === regionName)) return p;
        }
      }
    } catch (_) {}
    return null;
  }

  // ════════════════════════════════════════════════════════════
  //  §10 商誉与商业网络（SubTask 17.9）
  // ════════════════════════════════════════════════════════════

  function _getReputation() {
    var s = _getState();
    return s ? (s.reputation || 0) : 0;
  }

  // _applyReputationGain(delta, caravan) → { ok, before, after, newNetworks, npcRelations }
  //   商誉积累·超阈值开启新商业网络·并通过 TM.PlayerInteraction.interact 关联 NPC 关系
  function _applyReputationGain(delta, caravan) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '商队账本未就绪' };
    var before = s.reputation || 0;
    s.reputation = _clamp(before + delta, 0, 1000); // arch-ok

    // 检查是否开启新网络
    var newNetworks = [];
    REPUTATION_NETWORK_TIERS.forEach(function (tier) {
      if (before < tier.rep && s.reputation >= tier.rep) {
        var exists = s.networks.some(function (n) { return n && n.id === tier.network; });
        if (!exists) {
          s.networks.push({ // arch-ok
            id: tier.network,
            label: tier.network,
            desc: tier.desc,
            unlockedAt: _curTurn(),
            reputation: tier.rep
          });
          newNetworks.push(tier);
          _addEB('跑商', '商誉达 ' + s.reputation + '·开启「' + tier.network + '」');
        }
      }
    });

    // 关联 NPC 关系：商誉每达一档·与当地市井 NPC 友善度 +
    //   软依赖 TM.PlayerInteraction.interact（缺席时跳过·不阻断）
    var npcRelations = [];
    try {
      if (TM && TM.PlayerInteraction && typeof TM.PlayerInteraction.interact === 'function') {
        // 仅在商誉跨越阈值时触发·避免每次跑商都打扰 NPC
        if (newNetworks.length > 0 && typeof GM !== 'undefined' && GM && Array.isArray(GM.chars)) {
          // 找目的地附近的市井类 NPC（非君主·alive·role 含"商"/"贾"/"民"）
          var toRegion = caravan && caravan.route && caravan.route.to;
          for (var i = 0; i < GM.chars.length && npcRelations.length < 2; i++) {
            var c = GM.chars[i];
            if (!c || c.alive === false) continue;
            if (c.name === _playerName()) continue;
            var bag = ((c.role || '') + ' ' + (c.officialTitle || '') + ' ' + (c.title || ''));
            if (/商|贾|民|绅|市|贾人|富户/.test(bag) || (toRegion && c.location === toRegion)) {
              try {
                var r = TM.PlayerInteraction.interact(c.name, 'befriend', {
                  topic: '商路往来·' + (toRegion || ''),
                  intent: '通商结欢'
                });
                if (r && r.ok) npcRelations.push({ npc: c.name, kind: 'befriend' });
              } catch (_) {}
            }
          }
        }
      }
    } catch (_) {}

    return {
      ok: true,
      before: before,
      after: s.reputation,
      delta: delta,
      newNetworks: newNetworks.map(function (t) { return t.network; }),
      npcRelations: npcRelations
    };
  }

  function getReputation() {
    return _getReputation();
  }

  function listNetworks() {
    var s = _getState();
    if (!s) return [];
    return (s.networks || []).slice();
  }

  // ════════════════════════════════════════════════════════════
  //  §11 查询与取消
  // ════════════════════════════════════════════════════════════

  function _findCaravan(s, id) {
    if (!s || !Array.isArray(s.caravans) || !_isStr(id)) return null;
    for (var i = 0; i < s.caravans.length; i++) {
      if (s.caravans[i] && s.caravans[i].id === id) return s.caravans[i];
    }
    return null;
  }

  function listCaravans(filter) {
    var s = _getState();
    if (!s) return [];
    var list = (s.caravans || []).slice();
    if (filter && filter.status) {
      list = list.filter(function (c) { return c && c.status === filter.status; });
    }
    if (filter && filter.owner) {
      list = list.filter(function (c) { return c && c.owner === filter.owner; });
    }
    // 按 createdAt 倒序
    list.sort(function (a, b) {
      var ta = (a && a.createdAt) || 0;
      var tb = (b && b.createdAt) || 0;
      return tb - ta;
    });
    return list;
  }

  function getCaravan(id) {
    var s = _getState();
    if (!s) return null;
    var c = _findCaravan(s, id);
    return c ? JSON.parse(JSON.stringify(c)) : null;
  }

  function cancelCaravan(caravanId) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '商队账本未就绪' };
    var caravan = _findCaravan(s, caravanId);
    if (!caravan) return { ok: false, reason: '未找到商队: ' + caravanId };
    if (caravan.status === CARAVAN_STATUS.SETTLED || caravan.status === CARAVAN_STATUS.LOST) {
      return { ok: false, reason: '商队已结算·不可取消' };
    }
    var prevStatus = caravan.status;
    caravan.status = CARAVAN_STATUS.CANCELLED; // arch-ok

    // 已派遣商队取消·回收部分货物（折价 50%）
    var recovery = 0;
    if (prevStatus === CARAVAN_STATUS.DISPATCHED) {
      for (var i = 0; i < caravan.goods.length; i++) {
        var g = caravan.goods[i];
        recovery += Math.round((g.buyPrice || 0) * (g.qty || 0) * 0.5);
      }
      if (recovery > 0) {
        _addPlayerCash(recovery, 'trade:cancel-recovery');
      }
    }

    _pushLedger(s, 'caravan:cancel', recovery,
                '取消商队·' + caravan.route.from + '→' + caravan.route.to +
                '·回收 ' + recovery);
    _addEB('跑商', '取消商队·回收 ' + recovery + ' 两');

    // 商誉小损（已派遣却取消·商业信誉下降）
    if (prevStatus === CARAVAN_STATUS.DISPATCHED) {
      _applyReputationGain(-3, caravan);
    }

    return { ok: true, caravanId: caravan.id, prevStatus: prevStatus, recovery: recovery,
             cash: _getPlayerCash() };
  }

  // ════════════════════════════════════════════════════════════
  //  §12 御案"商队"面板（SubTask 17.10）
  // ════════════════════════════════════════════════════════════

  function renderPanel(targetEl) {
    var s = _getState();
    if (!s) return targetEl ? null : '<div class="pt-panel-empty">商队账本未就绪</div>';

    var cash = _getPlayerCash();
    var reputation = s.reputation || 0;
    var caravans = (s.caravans || []).slice().sort(function (a, b) {
      var ta = (a && a.createdAt) || 0;
      var tb = (b && b.createdAt) || 0;
      return tb - ta;
    });
    var networks = s.networks || [];
    var routes = listRoutes();
    var stats = s.stats || { totalTrades: 0, totalProfit: 0, totalLoss: 0, lostCount: 0 };

    var h = '<div class="pt-panel" id="ptPanel">';
    h += '<div class="pt-panel-head">';
    h += '<span class="pt-panel-title">' + _icon('route', 14) + ' 商队</span>';
    h += '<span class="pt-cash">银钱：<b>' + Math.round(cash) + '</b> 两</span>';
    h += '</div>';

    // 概览
    h += '<div class="pt-section"><div class="pt-section-title">概 览</div>';
    h += '<div class="pt-row"><span>商 誉</span><span class="pt-val">' + reputation + '</span></div>';
    h += '<div class="pt-row"><span>商业网络</span><span class="pt-val">' + networks.length + ' / ' + REPUTATION_NETWORK_TIERS.length + '</span></div>';
    h += '<div class="pt-row"><span>在役商队</span><span class="pt-val">' + caravans.filter(function (c) { return c && (c.status === 'forming' || c.status === 'dispatched' || c.status === 'arrived'); }).length + '</span></div>';
    h += '<div class="pt-row"><span>累计跑商</span><span class="pt-val">' + (stats.totalTrades || 0) + ' 次·盈 ' + (stats.totalProfit || 0) + ' / 损 ' + (stats.totalLoss || 0) + '</span></div>';
    h += '</div>';

    // 商业网络
    if (networks.length > 0) {
      h += '<div class="pt-section"><div class="pt-section-title">商 业 网 络</div>';
      networks.forEach(function (n) {
        if (!n) return;
        h += '<div class="pt-row"><span>' + _esc(n.label) + '</span><span class="pt-val">' + _esc(n.desc || '') + '</span></div>';
      });
      h += '</div>';
    }

    // 商队列表
    h += '<div class="pt-section"><div class="pt-section-title">商 队</div>';
    if (caravans.length === 0) {
      h += '<div class="pt-empty">尚无商队</div>';
    } else {
      caravans.forEach(function (c) {
        if (!c) return;
        h += '<div class="pt-caravan">';
        h += '<div class="pt-caravan-head">';
        h += '<span class="pt-caravan-route">' + _esc(c.route.from || '○') + ' → ' + _esc(c.route.to || '○') + '</span>';
        h += '<span class="pt-caravan-status pt-status-' + _esc(c.status) + '">' + _esc(_statusLabel(c.status)) + '</span>';
        h += '</div>';
        h += '<div class="pt-caravan-meta">';
        var goodsStr = (c.goods || []).map(function (g) { return g.name + '×' + g.qty; }).join('、');
        h += '<span>货物：' + _esc(goodsStr || '无') + '</span>';
        h += '<span>护卫 ' + (c.guards || 0) + ' · 车 ' + (c.carts || 0) + '</span>';
        h += '<span>凭引：' + _esc(c.permitLabel || c.permit || '无') + '</span>';
        h += '</div>';
        if (c.expectedProfit != null) {
          h += '<div class="pt-caravan-profit">预期利润：<b>' + c.expectedProfit + '</b> 两</div>';
        }
        if (c.actualProfit != null) {
          var pCls = c.actualProfit >= 0 ? 'pt-profit-pos' : 'pt-profit-neg';
          h += '<div class="pt-caravan-profit ' + pCls + '">实际盈亏：<b>' + (c.actualProfit >= 0 ? '+' : '') + c.actualProfit + '</b> 两</div>';
        }
        if (c.status === 'dispatched') {
          var pct = c.arrivalTurns ? Math.floor((c.progress / c.arrivalTurns) * 100) : 0;
          h += '<div class="pt-progress"><div class="pt-progress-bar" style="width:' + pct + '%"></div></div>';
          h += '<div class="pt-progress-meta">进度 ' + (c.progress || 0) + '/' + (c.arrivalTurns || 0) + '</div>';
        }
        if (c.events && c.events.length > 0) {
          h += '<div class="pt-events">路上 ' + c.events.length + ' 件事·' +
               c.events.map(function (e) { return e.title; }).join('、') + '</div>';
        }
        h += '</div>';
      });
    }
    h += '</div>';

    // 路线
    h += '<div class="pt-section"><div class="pt-section-title">通 用 路 线</div>';
    if (routes.length === 0) {
      h += '<div class="pt-empty">无可用路线</div>';
    } else {
      routes.forEach(function (r) {
        if (!r) return;
        h += '<div class="pt-row"><span>' + _esc(r.label) + '·' + _esc(r.terrain) + '</span><span class="pt-val">路程 ' + (r.baseDistance || 0) + '·' + (r.baseTurns || 0) + ' 回合</span></div>';
      });
      h += '<div class="pt-hint">朝代专属路线（丝路/茶马/漕运/海贸等）由剧本数据 hook·引擎只提供通用框架</div>';
    }
    h += '</div>';

    // 可选动作
    h += '<div class="pt-section"><div class="pt-section-title">可 选 动 作</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">';
    h += '<button class="bt bs" onclick="TM.PlayerTrade._uiCreateCaravan()">编组商队</button>';
    h += '<button class="bt bs" onclick="TM.PlayerTrade._uiAdvanceCaravan()">推进商队</button>';
    h += '<button class="bt bs" onclick="TM.PlayerTrade._uiSettleArrival()">结算抵达</button>';
    h += '</div>';
    h += '</div>';

    h += '</div>';

    // 内嵌样式（与 tm-player-economy.js / tm-player-movement.js 同风格·暗金主调）
    h += '<style>' +
      '.pt-panel{padding:0.8rem 1rem;background:linear-gradient(90deg,rgba(22,15,8,0.84),rgba(40,28,14,0.70) 46%,rgba(15,10,6,0.82));border:1px solid rgba(215,185,104,0.30);border-radius:3px;font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;}' +
      '.pt-panel-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(215,185,104,0.30);padding-bottom:0.4rem;margin-bottom:0.6rem;}' +
      '.pt-panel-title{color:var(--gold-400);letter-spacing:0.2em;font-size:1.05rem;}' +
      '.pt-cash{color:var(--color-foreground-secondary);font-size:0.85rem;}' +
      '.pt-section{margin-bottom:0.6rem;}' +
      '.pt-section-title{font-size:0.85rem;color:var(--gold-400);letter-spacing:0.15em;margin-bottom:0.3rem;padding-left:0.4rem;border-left:2px solid var(--gold-500);}' +
      '.pt-row{display:flex;justify-content:space-between;padding:0.2rem 0.4rem;font-size:0.82rem;border-bottom:1px dashed rgba(215,185,104,0.10);}' +
      '.pt-val{color:var(--gold-400);}' +
      '.pt-empty{color:var(--color-foreground-muted);font-style:italic;padding:0.4rem;font-size:0.8rem;}' +
      '.pt-hint{font-size:0.72rem;color:var(--color-foreground-muted);padding:0.2rem 0.4rem;font-style:italic;}' +
      '.pt-caravan{padding:0.4rem 0.5rem;background:var(--color-sunken);border-radius:var(--radius-md);margin-bottom:0.4rem;font-size:0.8rem;}' +
      '.pt-caravan-head{display:flex;justify-content:space-between;margin-bottom:0.2rem;}' +
      '.pt-caravan-route{color:var(--color-foreground);font-weight:bold;}' +
      '.pt-caravan-status{font-size:0.72rem;padding:0.1rem 0.4rem;border-radius:2px;background:rgba(215,185,104,0.15);color:var(--gold-400);}' +
      '.pt-status-settled{background:rgba(100,180,100,0.18);color:#7fc97f;}' +
      '.pt-status-lost,.pt-status-cancelled{background:rgba(220,80,80,0.18);color:#e07070;}' +
      '.pt-status-dispatched{background:rgba(120,160,220,0.18);color:#80b0e0;}' +
      '.pt-caravan-meta{display:flex;justify-content:space-between;font-size:0.72rem;color:var(--color-foreground-muted);margin-bottom:0.2rem;}' +
      '.pt-caravan-profit{font-size:0.78rem;padding:0.15rem 0;}' +
      '.pt-profit-pos{color:#7fc97f;}' +
      '.pt-profit-neg{color:#e07070;}' +
      '.pt-progress{height:5px;background:rgba(0,0,0,0.4);border-radius:3px;overflow:hidden;margin:0.2rem 0;}' +
      '.pt-progress-bar{height:100%;background:linear-gradient(90deg,var(--gold-500),var(--gold-400));transition:width 0.3s;}' +
      '.pt-progress-meta{font-size:0.7rem;color:var(--color-foreground-muted);}' +
      '.pt-events{font-size:0.7rem;color:var(--color-foreground-muted);padding-top:0.2rem;border-top:1px dashed rgba(215,185,104,0.15);}' +
      '</style>';

    if (targetEl && typeof targetEl === 'object') {
      try { targetEl.innerHTML = h; return null; } catch (_) { return h; }
    }
    return h;
  }

  function _statusLabel(status) {
    var map = {
      forming: '组建中', dispatched: '派遣中', arrived: '已到达',
      settled: '已结算', cancelled: '已取消', lost: '全军覆没'
    };
    return map[status] || status;
  }

  // ════════════════════════════════════════════════════════════
  //  §12.5 UI 钩子（2026-07-21·沿用 tm-player-marriage.js C2 模式）
  //    showPrompt 收输入 → 调内部 API → toast 反馈 → refreshAll 刷面板
  // ════════════════════════════════════════════════════════════

  function _refreshPanel() {
    try {
      if (global.TM && global.TM.PlayerShell && typeof global.TM.PlayerShell.refreshAll === 'function') {
        global.TM.PlayerShell.refreshAll();
      }
    } catch (_) {}
  }

  // 编组商队：showPrompt 收「起点|终点|货物名|数量|护卫|车数」→ 调 createCaravan
  function _uiCreateCaravan() {
    if (!_isTransmigration()) { _toast('非穿越模式'); return; }
    var s = _ensureState();
    if (!s) { _toast('商队账本未就绪'); return; }
    if (typeof showPrompt !== 'function') {
      _addEB('跑商', 'showPrompt 缺席·请在剧本面板中编组商队');
      return;
    }
    showPrompt('编组商队（起点|终点|货物名|数量|护卫|车数）：', '洛阳|长安|silk|5|5|1', function (input) {
      if (!input) return;
      var parts = String(input).split('|').map(function (x) { return (x || '').trim(); });
      if (parts.length < 4 || !parts[0] || !parts[1] || !parts[2]) {
        _toast('格式错误·须至少「起点|终点|货物名|数量」');
        return;
      }
      var from = parts[0], to = parts[1], goodsName = parts[2];
      var qty = parseInt(parts[3], 10) || 5;
      var guards = parts[4] ? (parseInt(parts[4], 10) || 0) : 5;
      var carts = parts[5] ? (parseInt(parts[5], 10) || 1) : 1;
      var r = createCaravan({
        from: from, to: to,
        goods: [{ name: goodsName, qty: qty }],
        guards: guards, carts: carts,
        permit: 'local'
      });
      if (r.ok) {
        _toast('商队已组建·' + from + '→' + to + '·共费 ' + r.cost.total + ' 两');
      } else {
        _toast('组建失败：' + (r.reason || '未知'));
      }
      _refreshPanel();
    });
  }

  // 推进商队：若仅一个派遣中商队·直调；否则 showPrompt 选序号
  function _uiAdvanceCaravan() {
    if (!_isTransmigration()) { _toast('非穿越模式'); return; }
    var s = _ensureState();
    if (!s) { _toast('商队账本未就绪'); return; }
    var dispatched = (s.caravans || []).filter(function (c) {
      return c && c.status === CARAVAN_STATUS.DISPATCHED;
    });
    if (dispatched.length === 0) {
      _toast('无派遣中的商队可推进');
      return;
    }
    if (dispatched.length === 1) {
      _doAdvance(dispatched[0].id);
      return;
    }
    if (typeof showPrompt !== 'function') {
      _addEB('跑商', 'showPrompt 缺席·有多个派遣中商队·须指定');
      return;
    }
    var list = dispatched.map(function (c, i) {
      return (i + 1) + '.' + c.route.from + '→' + c.route.to + '(' + (c.progress || 0) + '/' + (c.arrivalTurns || 0) + ')';
    }).join(' ');
    showPrompt('多个派遣中商队·输入序号推进：' + list, '1', function (idxStr) {
      var idx = parseInt(idxStr, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= dispatched.length) {
        _toast('序号无效');
        return;
      }
      _doAdvance(dispatched[idx].id);
    });
  }

  function _doAdvance(caravanId) {
    var r = advanceCaravan(caravanId);
    if (r.ok) {
      if (r.arrived) {
        _toast('商队已抵达·净盈亏 ' + (r.settlement ? r.settlement.actualProfit : '?'));
      } else {
        _toast('推进 1 回合·进度 ' + r.progress + '/' + r.totalTurns +
               (r.event ? '·路上遇' + r.event.title : ''));
      }
    } else {
      _toast('推进失败：' + (r.reason || '未知'));
    }
    _refreshPanel();
  }

  // 结算抵达：若仅一个已到达商队·直调；否则 showPrompt 选序号
  function _uiSettleArrival() {
    if (!_isTransmigration()) { _toast('非穿越模式'); return; }
    var s = _ensureState();
    if (!s) { _toast('商队账本未就绪'); return; }
    var arrived = (s.caravans || []).filter(function (c) {
      return c && c.status === CARAVAN_STATUS.ARRIVED;
    });
    if (arrived.length === 0) {
      _toast('无已抵达待结算的商队');
      return;
    }
    if (arrived.length === 1) {
      _doSettle(arrived[0].id);
      return;
    }
    if (typeof showPrompt !== 'function') {
      _addEB('跑商', 'showPrompt 缺席·有多个待结算商队·须指定');
      return;
    }
    var list = arrived.map(function (c, i) {
      return (i + 1) + '.' + c.route.from + '→' + c.route.to;
    }).join(' ');
    showPrompt('多个待结算商队·输入序号结算：' + list, '1', function (idxStr) {
      var idx = parseInt(idxStr, 10) - 1;
      if (isNaN(idx) || idx < 0 || idx >= arrived.length) {
        _toast('序号无效');
        return;
      }
      _doSettle(arrived[idx].id);
    });
  }

  function _doSettle(caravanId) {
    var r = settleArrival(caravanId);
    if (r.ok) {
      _toast('已结算·净盈亏 ' + r.actualProfit + '·银钱 ' + r.cash);
    } else {
      _toast('结算失败：' + (r.reason || '未知'));
    }
    _refreshPanel();
  }

  // ════════════════════════════════════════════════════════════
  //  §13 导出（双路径挂载：global.TM.PlayerTrade + module.exports）
  // ════════════════════════════════════════════════════════════

  var ns = {
    // 常量
    CARAVAN_STATUS: CARAVAN_STATUS,
    PERMIT_LEVELS: PERMIT_LEVELS,
    RISK_TYPES: RISK_TYPES,
    DEFAULT_ROUTES: DEFAULT_ROUTES,
    REPUTATION_NETWORK_TIERS: REPUTATION_NETWORK_TIERS,
    MAGNATE_TRADE_THRESHOLD: MAGNATE_TRADE_THRESHOLD,

    // 查询
    listCaravans: listCaravans,
    getCaravan: getCaravan,
    listRoutes: listRoutes,
    getRoute: getRoute,
    getReputation: getReputation,
    listNetworks: listNetworks,

    // 主流程
    createCaravan: createCaravan,
    dispatchTrade: dispatchTrade,
    advanceCaravan: advanceCaravan,
    cancelCaravan: cancelCaravan,
    settleArrival: settleArrival,
    estimateProfit: estimateProfit,
    triggerRiskEvent: triggerRiskEvent,

    // 御案面板
    renderPanel: renderPanel,

    // 内部函数（smoke/调试·非游戏调用入口）
    _getState: _getState,
    _ensureState: _ensureState,
    _getPlayerCash: _getPlayerCash,
    _spendPlayerCash: _spendPlayerCash,
    _addPlayerCash: _addPlayerCash,
    _getRegionPrice: _getRegionPrice,
    _mockPrice: _mockPrice,
    _getOfficialRelation: _getOfficialRelation,
    _callLLM: _callLLM,
    _generateScene: _generateScene,
    _resolveRoute: _resolveRoute,
    _estimateRiskLoss: _estimateRiskLoss,
    _permitMitigate: _permitMitigate,
    _computeRiskEffect: _computeRiskEffect,
    _pickRiskType: _pickRiskType,
    _applyMagnateImpact: _applyMagnateImpact,
    _findProvince: _findProvince,
    _applyReputationGain: _applyReputationGain,
    _isTransmigration: _isTransmigration,

    // UI 钩子
    _uiCreateCaravan: _uiCreateCaravan,
    _uiAdvanceCaravan: _uiAdvanceCaravan,
    _uiSettleArrival: _uiSettleArrival
  };

  TM.PlayerTrade = ns;

  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = { PlayerTrade: ns };
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
