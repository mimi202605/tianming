// @ts-check
/// <reference path="types.d.ts" />
/* ============================================================
 * tm-data-access.js — 统一数据访问层（Strangler Pattern 桥接层）
 *
 * 目的：把散落在 67+ 个文件中的 GM.xx / P.xx 直接读写，逐步收拢到单一门面 window.DA。
 *      当前版本只做门面，内部委托给现有函数（findCharByName 等）和 GM/P。
 *      迁移策略：新代码用 DA.*，旧代码不动；未来要重构 GM 结构只需改 DAL 内部。
 *
 * 设计原则：
 *   1. 纯代理，不做业务逻辑（业务逻辑留在原文件）
 *   2. 不破坏现有行为：DA.chars.findByName 调用 findCharByName，完全等价
 *   3. 可观测：DA._accessLog 可选记录，用于分析热路径与误用
 *   4. 失败软化：目标数据缺失时返回 undefined/默认值，不抛
 *
 * 使用：
 *   var ch = DA.chars.findByName('朱由检');
 *   var money = DA.guoku.getStock('money');
 *   DA.chars.forEachAlive(function(c){ ... });
 *
 * 调试：
 *   window.DA._logAccess = true  → 开启访问日志
 *   DA._accessLog                → 查看最近 500 条访问
 * ============================================================ */
(function(){
  'use strict';
  if (typeof window === 'undefined') return;
  if (window.DA) return; // 幂等
  var DA = {};

  // ─── 访问日志（可选，默认关） ───
  DA._logAccess = false;
  DA._accessLog = [];
  function _log(area, op, arg) {
    if (!DA._logAccess) return;
    DA._accessLog.push({ t: Date.now(), area: area, op: op, arg: arg });
    if (DA._accessLog.length > 500) DA._accessLog.shift();
  }

  function _G() { return typeof GM !== 'undefined' ? GM : {}; }
  function _P() { return typeof P !== 'undefined' ? P : {}; }
  function _armyTroopCount(a) {
    if (!a) return 0;
    var v = a.soldiers;
    if (v == null) v = a.troops;
    if (v == null) v = a.size;
    if (v == null) v = a.strength;
    if (v == null) v = a.initialTroops;
    v = Number(v);
    return isFinite(v) ? Math.max(0, Math.round(v)) : 0;
  }
  function _readMetricValue(v, keys, fallback) {
    if (typeof v === 'number' && isFinite(v)) return v;
    if (v && typeof v === 'object') {
      for (var i = 0; i < keys.length; i++) {
        var k = keys[i];
        if (typeof v[k] === 'number' && isFinite(v[k])) return v[k];
      }
    }
    return fallback;
  }

  function _walkOfficeTree(nodes, visitor) {
    for (var i = 0; i < (nodes || []).length; i++) {
      var n = nodes[i];
      if (!n) continue;
      if (visitor(n) === false) return false;
      if (n.subs && _walkOfficeTree(n.subs, visitor) === false) return false;
    }
    return true;
  }

  // ============================================================
  // DA.chars — 角色访问
  // ============================================================
  DA.chars = {
    /** 按姓名/字/号/别名查找，O(1) 走索引 */
    findByName: function(name) {
      _log('chars', 'findByName', name);
      if (typeof findCharByName === 'function') return findCharByName(name);
      var arr = _G().chars || [];
      for (var i = 0; i < arr.length; i++) if (arr[i] && arr[i].name === name) return arr[i];
      return undefined;
    },
    /** 按 id 查找（优先），回退到按 name 查找 */
    findById: function(id) {
      _log('chars', 'findById', id);
      if (typeof findCharById === 'function') return findCharById(id);
      var arr = _G().chars || [];
      for (var i = 0; i < arr.length; i++) if (arr[i] && (arr[i].id === id || arr[i].name === id)) return arr[i];
      return undefined;
    },
    /** 返回所有活着的角色（alive !== false） */
    allAlive: function() {
      _log('chars', 'allAlive');
      return (_G().chars || []).filter(function(c){ return c && c.alive !== false; });
    },
    /** 遍历所有活着的角色 */
    forEachAlive: function(fn) {
      var arr = _G().chars || [];
      for (var i = 0; i < arr.length; i++) {
        var c = arr[i];
        if (c && c.alive !== false) fn(c, i);
      }
    },
    /** 按势力筛选 */
    byFaction: function(facName) {
      _log('chars', 'byFaction', facName);
      return (_G().chars || []).filter(function(c){ return c && c.faction === facName; });
    },
    /** 按地点筛选（宽松匹配） */
    byLocation: function(loc) {
      _log('chars', 'byLocation', loc);
      if (!loc) return [];
      return (_G().chars || []).filter(function(c){
        if (!c || c.alive === false) return false;
        var cl = c.location || c.loc || '';
        return cl === loc || cl.indexOf(loc) >= 0 || loc.indexOf(cl) >= 0;
      });
    },
    /** 统计：当前活着角色数 */
    countAlive: function() { return DA.chars.allAlive().length; },
    /** 玩家角色 */
    player: function() {
      _log('chars', 'player');
      return (_G().chars || []).find(function(c){ return c && c.isPlayer; });
    },
    /** 角色属性安全增减（上下限自动钳制 0-100） */
    adjustStat: function(charOrName, field, delta, min, max) {
      var c = typeof charOrName === 'string' ? DA.chars.findByName(charOrName) : charOrName;
      if (!c || !field) return false;
      var v = (c[field] || 0) + delta;
      if (typeof min === 'number' && v < min) v = min;
      if (typeof max === 'number' && v > max) v = max;
      c[field] = v;
      return true;
    }
  };

  // ============================================================
  // DA.factions — 势力访问
  // ============================================================
  DA.factions = {
    findByName: function(name) {
      _log('factions', 'findByName', name);
      if (typeof findFacByName === 'function') return findFacByName(name);
      return (_G().facs || []).find(function(f){ return f && f.name === name; });
    },
    all: function() { return _G().facs || []; },
    playerFaction: function() {
      var pf = (_G().P && _G().P.playerFactionName) || (_P().playerFactionName);
      return pf ? DA.factions.findByName(pf) : null;
    },
    byRelation: function(toFac, minRel) {
      return (_G().facs || []).filter(function(f){
        if (!f || !f.relations) return false;
        var r = f.relations[toFac];
        return typeof r === 'number' && r >= (minRel || 0);
      });
    }
  };

  // ============================================================
  // DA.parties / classes — 党派与阶层
  // ============================================================
  DA.parties = {
    findByName: function(name) {
      _log('parties', 'findByName', name);
      if (typeof findPartyByName === 'function') return findPartyByName(name);
      return (_G().parties || []).find(function(p){ return p && p.name === name; });
    },
    all: function() { return _G().parties || []; }
  };
  DA.classes = {
    findByName: function(name) {
      _log('classes', 'findByName', name);
      if (typeof findClassByName === 'function') return findClassByName(name);
      return (_G().classes || []).find(function(k){ return k && k.name === name; });
    },
    all: function() { return _G().classes || []; }
  };

  // ============================================================
  // DA.guoku — 国库访问（GuokuEngine API 门面，兼容 GM.guoku 裸读）
  // ============================================================
  DA.guoku = {
    /** 获取某科目的当前库存 */
    getStock: function(category) {
      _log('guoku', 'getStock', category);
      var g = _G().guoku;
      if (!g || !g.ledgers) return 0;
      var led = g.ledgers[category || 'money'];
      return led ? (led.stock || 0) : 0;
    },
    /** 三科目快读 */
    money: function() { return DA.guoku.getStock('money'); },
    grain: function() { return DA.guoku.getStock('grain'); },
    cloth: function() { return DA.guoku.getStock('cloth'); },
    /** 返回三科目对象 {money, grain, cloth} */
    allStocks: function() {
      return { money: DA.guoku.money(), grain: DA.guoku.grain(), cloth: DA.guoku.cloth() };
    },
    /** 是否破产（三库全为零或负） */
    isBankrupt: function() {
      if (typeof GuokuEngine !== 'undefined' && typeof GuokuEngine.checkBankruptcy === 'function') {
        try { return !!GuokuEngine.checkBankruptcy(); } catch(e) {
          if (window.TM && TM.errors) TM.errors.capture(e, 'DA.guoku.isBankrupt');
        }
      }
      return DA.guoku.money() <= 0 && DA.guoku.grain() <= 0 && DA.guoku.cloth() <= 0;
    },
    /** 月度乘数（从年度到月度的换算，一般 ~1/12） */
    monthRatio: function() {
      if (typeof GuokuEngine !== 'undefined' && typeof GuokuEngine.getMonthRatio === 'function') {
        return GuokuEngine.getMonthRatio();
      }
      return 1/12;
    },
    /** 确保数据模型就绪（调 GuokuEngine.ensureModel） */
    ensureModel: function() {
      if (typeof GuokuEngine !== 'undefined' && typeof GuokuEngine.ensureModel === 'function') {
        GuokuEngine.ensureModel();
        return true;
      }
      return false;
    },
    /** 税率/税基计算（经 GuokuEngine.computeTaxFlow） */
    computeTaxFlow: function(annualNominal) {
      if (typeof GuokuEngine !== 'undefined' && typeof GuokuEngine.computeTaxFlow === 'function') {
        return GuokuEngine.computeTaxFlow(annualNominal);
      }
      return null;
    },
    /** 8 大收入源元信息（来自 engine 或 p4 包装版） */
    sources: function() {
      return (typeof GuokuEngine !== 'undefined' ? GuokuEngine.Sources : null) || null;
    },
    /** 8 大支出类元信息 */
    expenses: function() {
      return (typeof GuokuEngine !== 'undefined' ? GuokuEngine.Expenses : null) || null;
    },
    /** 财政改革列表（p4 提供，可能不存在） */
    reforms: function() {
      return (typeof GuokuEngine !== 'undefined' ? GuokuEngine.FISCAL_REFORMS : null) || null;
    },
    /** 借款源（p5 提供） */
    loanSources: function() {
      return (typeof GuokuEngine !== 'undefined' ? GuokuEngine.LOAN_SOURCES : null) || null;
    },
    /** 直接开销（不走会计事件，仅用于简单扣减） */
    spendUnchecked: function(category, amount, reason) {
      var g = _G().guoku;
      if (!g || !g.ledgers || !g.ledgers[category]) return false;
      g.ledgers[category].stock = (g.ledgers[category].stock || 0) - Math.abs(amount);
      if (reason && Array.isArray(g._recentOps)) g._recentOps.push({ t: _G().turn, cat: category, delta: -Math.abs(amount), reason: reason });
      return true;
    },
    /** 存款（类似 spend 但加） */
    creditUnchecked: function(category, amount, reason) {
      var g = _G().guoku;
      if (!g || !g.ledgers || !g.ledgers[category]) return false;
      g.ledgers[category].stock = (g.ledgers[category].stock || 0) + Math.abs(amount);
      if (reason && Array.isArray(g._recentOps)) g._recentOps.push({ t: _G().turn, cat: category, delta: +Math.abs(amount), reason: reason });
      return true;
    }
  };

  // ============================================================
  // DA.officeTree — 官制树访问
  // ============================================================
  DA.officeTree = {
    /** 获取运行时树（优先 GM，回退 P） */
    get: function() {
      return (_G().officeTree && _G().officeTree.length) ? _G().officeTree : (_P().officeTree || []);
    },
    /** 查找某官位（按部门+职位名）返回 {dept, position} */
    findPosition: function(deptName, positionName) {
      _log('officeTree', 'findPosition', deptName + '/' + positionName);
      var tree = DA.officeTree.get();
      var found = null;
      _walkOfficeTree(tree, function(n) {
        if (n.name === deptName && Array.isArray(n.positions)) {
          var pos = n.positions.find(function(p){ return p && p.name === positionName; });
          if (pos) {
            found = { dept: n, position: pos };
            return false;
          }
        }
        return true;
      });
      return found;
    },
    /** 某角色占据的所有官职 [{dept, position}] */
    postsOf: function(charName) {
      _log('officeTree', 'postsOf', charName);
      var out = [];
      _walkOfficeTree(DA.officeTree.get(), function(n) {
        (n.positions||[]).forEach(function(p){
          if (p && p.holder === charName) out.push({ dept: n, position: p });
        });
        return true;
      });
      return out;
    }
  };

  // ============================================================
  // DA.admin — 行政区划
  // ============================================================
  DA.admin = {
    get: function() {
      var gh = _G().adminHierarchy;
      if (gh && (Array.isArray(gh) ? gh.length : Object.keys(gh).length)) return gh;
      return _P().adminHierarchy || (Array.isArray(gh) ? [] : {});
    },
    findDivision: function(name) {
      _log('admin', 'findDivision', name);
      if (typeof findDivisionByName === 'function') return findDivisionByName(name);
      var h = DA.admin.get();
      var found = null;
      function walk(nodes) {
        if (!nodes || found) return;
        var arr = Array.isArray(nodes) ? nodes : Object.values(nodes);
        arr.forEach(function(n){
          if (found || !n) return;
          if (n.name === name) { found = n; return; }
          if (n.children) walk(n.children);
        });
      }
      walk(h);
      return found;
    },
    getProvinceStats: function(provName) {
      var s = _G().provinceStats;
      return s ? s[provName] : null;
    }
  };

  // ============================================================
  // DA.turn — 回合元数据
  // ============================================================
  DA.turn = {
    current: function() { return _G().turn || 0; },
    date: function() { return _G().date || ''; },
    dateOfTurn: function(t) {
      if (typeof getTSText === 'function') return getTSText(t);
      return '第' + t + '回合';
    },
    isRunning: function() { return !!_G().running; }
  };

  // ============================================================
  // DA.edict — 诏书建议库
  // ============================================================
  DA.edict = {
    suggestions: function() {
      if (!_G()._edictSuggestions) _G()._edictSuggestions = [];
      return _G()._edictSuggestions;
    },
    addSuggestion: function(item) {
      if (!item || !item.content) return false;
      var list = DA.edict.suggestions();
      list.push(Object.assign({ turn: DA.turn.current(), used: false }, item));
      return true;
    }
  };

  // ============================================================
  // DA.issues — 时局要务
  // ============================================================
  DA.issues = {
    all: function() { return _G().currentIssues || []; },
    pending: function() { return DA.issues.all().filter(function(i){ return i && i.status === 'pending'; }); },
    findById: function(id) { return DA.issues.all().find(function(i){ return i && i.id === id; }); },
    resolve: function(id, resolvedDate) {
      var it = DA.issues.findById(id);
      if (!it) return false;
      it.status = 'resolved';
      it.resolvedTurn = DA.turn.current();
      it.resolvedDate = resolvedDate || DA.turn.date();
      return true;
    }
  };

  // ============================================================
  // DA.armies — 军队访问
  // ============================================================
  DA.armies = {
    all: function() { return _G().armies || []; },
    findByName: function(name) {
      _log('armies', 'findByName', name);
      return DA.armies.all().find(function(a){ return a && a.name === name; });
    },
    byFaction: function(facName) {
      return DA.armies.all().filter(function(a){ return a && a.faction === facName; });
    },
    byCommander: function(charName) {
      return DA.armies.all().filter(function(a){ return a && a.commander === charName; });
    },
    totalTroops: function(facName) {
      return DA.armies.all().reduce(function(s, a){
        if (facName && a.faction !== facName) return s;
        return s + _armyTroopCount(a);
      }, 0);
    },
    activeWars: function() { return _G().activeWars || []; },
    activeBattles: function() { return _G().activeBattles || []; }
  };

  // ============================================================
  // DA.harem — 后宫访问
  // ============================================================
  DA.harem = {
    get: function() { return _G().harem || {}; },
    concubines: function() {
      var h = DA.harem.get();
      return h.concubines || [];
    },
    findByName: function(name) {
      return DA.harem.concubines().find(function(c){ return c && c.name === name; });
    },
    pregnancies: function() {
      return DA.harem.concubines().filter(function(c){ return c && c.pregnant; });
    },
    empress: function() {
      return DA.harem.concubines().find(function(c){ return c && c.rank === 'empress'; });
    }
  };

  // ============================================================
  // DA.authority — 权威系统（皇权/皇威/民心）
  // ============================================================
  DA.authority = {
    get: function() {
      var G = _G();
      var legacy = G.authority || {};
      var out = {};
      Object.keys(legacy).forEach(function(k){ out[k] = legacy[k]; });
      if (G.huangquan !== undefined) out.huangquan = G.huangquan;
      if (G.huangwei !== undefined) out.huangwei = G.huangwei;
      if (G.minxin !== undefined) out.minxin = G.minxin;
      return out;
    },
    huangquan: function() {
      var a = DA.authority.get();
      return _readMetricValue(a.huangquan, ['index', 'value', 'trueIndex'], 50);
    },
    huangwei: function() {
      var a = DA.authority.get();
      return _readMetricValue(a.huangwei, ['index', 'value', 'trueIndex'], 50);
    },
    minxin: function() {
      var a = DA.authority.get();
      return _readMetricValue(a.minxin, ['trueIndex', 'index', 'value'], 50);
    },
    powerMinister: function() {
      return DA.authority.get().powerMinister || null;
    },
    tyrantLevel: function() {
      var t = DA.authority.get().tyrant;
      return t ? (t.level || 0) : 0;
    }
  };

  // ============================================================
  // DA.memorials — 奏疏
  // ============================================================
  DA.memorials = {
    all: function() { return _G().memorials || []; },
    unbatched: function() { return DA.memorials.all().filter(function(m){ return m && !m.batched; }); },
    byChar: function(charName) {
      return DA.memorials.all().filter(function(m){ return m && m.author === charName; });
    },
    recent: function(n) {
      var list = DA.memorials.all();
      return list.slice(Math.max(0, list.length - (n||10)));
    }
  };

  // ============================================================
  // DA.chronicle — 编年/史记
  // ============================================================
  DA.chronicle = {
    yearly: function() { return _G().yearlyChronicles || []; },
    recent: function(turns) {
      var list = DA.chronicle.yearly();
      return list.slice(Math.max(0, list.length - (turns||3)));
    },
    arcs: function() { return _G().characterArcs || []; },
    afterwords: function() { return _G().chronicleAfterwords || []; },
    playerDecisions: function() { return _G().playerDecisions || []; }
  };

  // ============================================================
  // DA.npcMemory — NPC 记忆
  // ============================================================
  DA.npcMemory = {
    get: function() { return _G().npcMemory || {}; },
    ofChar: function(charName) {
      var m = DA.npcMemory.get();
      return (m && m[charName]) || [];
    },
    remember: function(charName, memory) {
      if (typeof NpcMemorySystem !== 'undefined' && typeof NpcMemorySystem.remember === 'function') {
        NpcMemorySystem.remember(charName, memory);
        return true;
      }
      return false;
    }
  };

  // ============================================================
  // DA.qiju / DA.jishi — 起居注 / 纪事
  // ============================================================
  DA.qiju = {
    all: function() { return _G().qijuHistory || []; },
    recent: function(n) {
      var list = DA.qiju.all();
      return list.slice(Math.max(0, list.length - (n||5)));
    },
    push: function(entry) {
      if (!_G().qijuHistory) _G().qijuHistory = [];
      _G().qijuHistory.push(Object.assign({ turn: DA.turn.current(), date: DA.turn.date() }, entry));
    }
  };
  DA.jishi = {
    all: function() { return _G().jishiRecords || []; },
    byChar: function(charName) {
      return DA.jishi.all().filter(function(r){ return r && r.char === charName; });
    },
    push: function(record) {
      if (!_G().jishiRecords) _G().jishiRecords = [];
      _G().jishiRecords.push(Object.assign({ turn: DA.turn.current() }, record));
    }
  };

  // ============================================================
  // DA.era — 时代状态
  // ============================================================
  DA.era = {
    get: function() { return _G().eraState || {}; },
    dynastyPhase: function() { return DA.era.get().dynastyPhase || 'stable'; },
    socialStability: function() { return DA.era.get().socialStability || 50; },
    taxPressure: function() { return _G().taxPressure; }
  };

  // ============================================================
  // DA.scenario — 当前剧本
  // ============================================================
  DA.scenario = {
    current: function() {
      var sid = _G().sid;
      if (!sid) return null;
      if (typeof findScenarioById === 'function') return findScenarioById(sid);
      return (_P().scenarios || []).find(function(s){ return s && s.id === sid; });
    },
    name: function() {
      var sc = DA.scenario.current();
      return sc ? (sc.name || '') : '';
    }
  };

  // ============================================================
  // DA.meta — 领域元信息（可被测试/文档/编辑器引用）
  // ============================================================
  DA.meta = {
    /** 当前 DA 已覆盖的 GM 字段清单 —— 未来重构 GM 结构时对照 */
    coveredGMFields: [
      'chars', 'facs', 'parties', 'classes',
      'guoku.ledgers',
      'officeTree',
      'adminHierarchy', 'provinceStats',
      'turn', 'date', 'running',
      '_edictSuggestions', 'currentIssues',
      'armies', 'activeWars', 'activeBattles',
      'harem',
      'authority',
      'memorials',
      'yearlyChronicles', 'characterArcs', 'chronicleAfterwords', 'playerDecisions',
      'npcMemory',
      'qijuHistory', 'jishiRecords',
      'eraState', 'taxPressure',
      'sid'
    ],
    /** 访问日志 on/off */
    enableLog: function(on) { DA._logAccess = !!on; },
    clearLog: function() { DA._accessLog.length = 0; },
    logSummary: function() {
      var byArea = {};
      DA._accessLog.forEach(function(e){
        var k = e.area + '.' + e.op;
        byArea[k] = (byArea[k]||0) + 1;
      });
      return byArea;
    }
  };

  window.DA = DA;
})();
