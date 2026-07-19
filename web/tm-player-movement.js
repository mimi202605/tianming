// ============================================================
// tm-player-movement.js — 穿越模式 Phase 4.5 · Task 21 玩家自由移动系统
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何朝代专属机构/职务专名（一律由剧本 hook）。
//   君主具体职务/内廷宦官具体职务/科场具体名目/邮驿具体建制皆由剧本 hook，
//   引擎层只提供「玩家移动 + 路径算法 + 5 种移动方式 + 移动事件 + 地点动作集」通用框架。
//   通用词「京城/地方/封国/边疆/名胜/敌国化外」「驿站」「朝议」「奏疏」等跨朝代通用，
//   明清两朝专属建制名目（含其内廷秘书机构、特务缉捕机构、科举文体、奏报文书专称等）一律不得出现。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerMovement.{getState, getCurrentLocation, getTravelStatus,
//   getDiscoveredLocations, isTraveling, getAvailableActions,
//   travelTo, cancelTravel, advanceTravel,
//   getModeConfig, getAllModes, canUseRelay,
//   triggerTravelEvent,
//   bringEntourage, computeEntourageCost,
//   discoverLocation, classifyLocation, getActionsForLocation,
//   computeRouteDistance, estimateTravelTime, estimateTravelCost,
//   renderMovementPanel,
//   MODES, LOCATION_TYPES, ACTIONS_BY_LOCATION}
// 依赖（运行时软依赖，缺席时降级）：
//   P.playerInfo / GM.chars / GM.turn / MarchSystem / findPath / callAI / TM.PlayerInteraction
// 双路径挂载：global.TM.PlayerMovement + module.exports
// ============================================================

(function (global) {
  'use strict';

  var TM = global.TM = global.TM || {};

  // ════════════════════════════════════════════════════════════
  //  §1 常量
  // ════════════════════════════════════════════════════════════

  // 五种移动方式·速度（领地/月·与 MarchSystem.baseSpeeds 同口径）/成本/精力
  //   驿站速度最快·官府负担·成本最低·但需官场关系
  var MODES = {
    walk:     { id: 'walk',     label: '步行', speed: 1.0, costPerTile: 1.0, energyPerTile: 2.0, requiresRelay: false, requiresWater: false, capacityMul: 1.0 },
    horse:    { id: 'horse',    label: '骑马', speed: 2.5, costPerTile: 2.0, energyPerTile: 0.8, requiresRelay: false, requiresWater: false, capacityMul: 1.0 },
    carriage: { id: 'carriage', label: '车驾', speed: 1.8, costPerTile: 3.5, energyPerTile: 0.4, requiresRelay: false, requiresWater: false, capacityMul: 1.6 },
    boat:     { id: 'boat',     label: '舟船', speed: 3.0, costPerTile: 1.5, energyPerTile: 0.2, requiresRelay: false, requiresWater: true,  capacityMul: 2.0 },
    relay:    { id: 'relay',    label: '驿站', speed: 4.5, costPerTile: 0.4, energyPerTile: 0.1, requiresRelay: true,  requiresWater: false, capacityMul: 1.2 }
  };

  // 地点类型·朝代中立（不挂某朝专属建制名）
  var LOCATION_TYPES = {
    CAPITAL:  'capital',   // 京城/国都/京师
    PROVINCE: 'province',  // 地方/州县
    FIEF:     'fief',      // 封国/封地
    FRONTIER: 'frontier',  // 边疆/边镇
    SCENIC:   'scenic',    // 名胜/隐逸地
    FOREIGN:  'foreign'    // 敌国/化外
  };

  // 地点类型识别关键词·跨朝代通用通称（具体城名/州县名由剧本 hook）
  var LOCATION_TYPE_KEYWORDS = {
    capital:  [/^京城$/, /京师/, /国都/, /帝都/, /京都/, /^都城$/],
    fief:     [/封国/, /封地/, /藩国/, /藩镇之藩/, /^诸侯国$/],
    frontier: [/边疆/, /边镇/, /边塞/, /边境/, /塞外/, /关外/, /北疆/, /南疆/, /西域/, /^漠北$/, /大漠/],
    scenic:   [/名胜/, /隐逸/, /名山/, /古迹/, /古战场/, /书院/, /道观/, /寺庙/, /江湖/],
    foreign:  [/敌国/, /化外/, /蛮荒/, /外邦/, /异域/]
  };

  // 地点决定动作集·每个地点类型提供朝代中立的通用动作清单
  //   剧本可经 hook 增减·引擎只提供通用框架
  var ACTIONS_BY_LOCATION = {
    capital: [
      { id: 'attend_court',    label: '上朝' },
      { id: 'visit_minister',  label: '拜访朝臣' },
      { id: 'join_chaoyi',     label: '参与朝议' },
      { id: 'submit_memorial', label: '上奏呈递' }
    ],
    province: [
      { id: 'govern_jurisdiction', label: '治理辖区' },
      { id: 'visit_gentry',        label: '拜访士绅' },
      { id: 'inspect_local',       label: '巡视地方' },
      { id: 'hold_local_trial',    label: '理讼问案' }
    ],
    fief: [
      { id: 'govern_fief',  label: '治理封国' },
      { id: 'drill_troops', label: '练兵演阵' },
      { id: 'collect_tribute', label: '征贡收赋' },
      { id: 'appoint_fief_official', label: '任免封国官属' }
    ],
    frontier: [
      { id: 'patrol_frontier', label: '巡视边防' },
      { id: 'recruit_frontier_general', label: '招揽边将' },
      { id: 'fortify_defense', label: '修筑边备' },
      { id: 'scout_enemy',     label: '哨探敌情' }
    ],
    scenic: [
      { id: 'study_travel',       label: '游学修习' },
      { id: 'recruit_scholar',    label: '招揽名士' },
      { id: 'discover_relic',     label: '寻访古迹' },
      { id: 'contemplate_scenery', label: '观景感悟' }
    ],
    foreign: [
      { id: 'trigger_diplomatic_event', label: '触发外交事件' },
      { id: 'become_wanted',            label: '被通缉（风险）' },
      { id: 'seek_asylum',              label: '请求庇护' },
      { id: 'smuggle_trade',            label: '走私贸易' }
    ]
  };

  // 移动事件类型·朝代中立
  var EVENT_TYPES = {
    BANDIT:    'bandit',    // 盗匪
    WEATHER:   'weather',   // 天气
    ENCOUNTER: 'encounter', // 偶遇 NPC
    RELIC:     'relic'      // 发现古迹
  };

  // 默认移动事件模板（LLM 不可用时的降级 mock·朝代中立短句）
  var _EVENT_MOCK_TEMPLATES = {
    bandit: [
      '山道之上忽有劫匪拦路，幸随从护卫得力，化险为夷。',
      '林间窜出数名剪径贼，破财消灾，伤一从人。',
      '夜宿荒村遇盗，连夜追赶不及，失银钱若干。'
    ],
    weather: [
      '途中骤雨倾盆，避雨半日方才行路。',
      '风雪交加，路阻山中，耽搁两日。',
      '江风骤起，舟船不得渡，候风三日始行。'
    ],
    encounter: [
      '道逢一老者，言谈甚契，相与同路数里。',
      '途中偶遇旧识，互叙别情，赠以诗扇。',
      '路边茶肆见一行客，对答数语，似是江湖中人。'
    ],
    relic: [
      '途经一处残碑，剥落可辨古人题刻，驻足良久。',
      '道旁见古垒遗址，抚碑叹息，记其形制。',
      '于荒寺后院得一古经残卷，藏之行囊。'
    ]
  };

  // ════════════════════════════════════════════════════════════
  //  §2 工具函数
  // ════════════════════════════════════════════════════════════

  function _isStr(v) { return typeof v === 'string'; }
  function _nonEmpty(v) { return v != null && v !== ''; }
  function _clamp(n, lo, hi) {
    n = Number(n);
    if (!isFinite(n)) n = lo;
    return Math.max(lo, Math.min(hi, n));
  }
  function _pick(arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''; }
  function _uid() {
    if (typeof uid === 'function') { try { return uid(); } catch (_) {} }
    return 'mv_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36);
  }
  function _turn() {
    try { if (typeof GM !== 'undefined' && GM && typeof GM.turn === 'number') return GM.turn; } catch (_) {}
    return 0;
  }
  function _turnDays() {
    if (typeof getTurnDays === 'function') { try { return getTurnDays(); } catch (_) {} }
    return 30;
  }
  function _esc(s) {
    if (typeof escHtml === 'function') return escHtml(s);
    if (s == null) return '';
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function _icon(name, size) {
    if (typeof tmIcon === 'function') { try { return tmIcon(name, size || 12); } catch (_) {} }
    return '';
  }
  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.warn('[PlayerMovement]', m); } catch (_) {}
  }
  function _addEB(cat, txt) {
    if (typeof addEB === 'function') { try { addEB(cat, txt); return; } catch (_) {} }
    try { console.log('[PlayerMovement][' + cat + ']', txt); } catch (_) {}
  }
  function _logDbg() {
    // 复用全局 _dbg（tm-military.js 等同风格）·缺席则降级 console
    try {
      if (typeof _dbg === 'function') { _dbg.apply(null, ['[PlayerMovement]'].concat(Array.prototype.slice.call(arguments))); return; }
    } catch (_) {}
    try { console.log.apply(console, ['[PlayerMovement]'].concat(Array.prototype.slice.call(arguments))); } catch (_) {}
  }

  function _player(root) {
    try {
      if (root && root._playerChar) return root._playerChar;
      var pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
      if (pi && pi.characterName) {
        var G = root || (typeof GM !== 'undefined' ? GM : null);
        if (G && Array.isArray(G.chars)) {
          for (var i = 0; i < G.chars.length; i++) {
            var c = G.chars[i];
            if (c && c.name === pi.characterName) return c;
          }
        }
      }
    } catch (_) {}
    return null;
  }

  // ════════════════════════════════════════════════════════════
  //  §3 状态读写（玩家移动状态挂在 P.playerInfo.movement）
  // ════════════════════════════════════════════════════════════

  function _ensureState() {
    if (typeof P === 'undefined' || !P || !P.playerInfo) return null;
    if (!P.playerInfo.movement || typeof P.playerInfo.movement !== 'object') {
      P.playerInfo.movement = _defaultState(); // arch-ok
    }
    var st = P.playerInfo.movement;
    // 兜底字段补齐（兼容旧存档）
    if (!_isStr(st.currentLocation)) st.currentLocation = '';
    if (!st.travelStatus || typeof st.travelStatus !== 'object') st.travelStatus = { moving: false, from: '', to: '', mode: '', eta: 0, startTurn: 0, progress: 0, totalTurns: 0, distance: 0, path: [] };
    if (!Array.isArray(st.discoveredLocations)) st.discoveredLocations = [];
    if (!Array.isArray(st.travelLog)) st.travelLog = [];
    return st;
  }

  function _defaultState() {
    return {
      currentLocation: '',
      travelStatus: {
        moving: false,
        from: '',
        to: '',
        mode: '',
        eta: 0,
        startTurn: 0,
        progress: 0,
        totalTurns: 0,
        distance: 0,
        path: []
      },
      discoveredLocations: [],
      travelLog: []
    };
  }

  function getState() {
    var st = _ensureState();
    if (!st) return _defaultState();
    return st;
  }

  function getCurrentLocation() {
    var st = _ensureState();
    return st ? (st.currentLocation || '') : '';
  }

  function getTravelStatus() {
    var st = _ensureState();
    if (!st) return _defaultState().travelStatus;
    return st.travelStatus;
  }

  function getDiscoveredLocations() {
    var st = _ensureState();
    return st ? st.discoveredLocations.slice() : [];
  }

  function isTraveling() {
    var st = _ensureState();
    if (!st) return false;
    return !!(st.travelStatus && st.travelStatus.moving === true);
  }

  // ════════════════════════════════════════════════════════════
  //  §4 地点类型判定 + 已发现地点管理
  // ════════════════════════════════════════════════════════════

  function classifyLocation(loc) {
    if (!_nonEmpty(loc)) return LOCATION_TYPES.PROVINCE;
    // 显式 hook：剧本可经 P.locationTypes 注入地名→类型映射
    try {
      if (typeof P !== 'undefined' && P && P.locationTypes && P.locationTypes[loc]) {
        return P.locationTypes[loc];
      }
    } catch (_) {}
    var s = String(loc);
    // 顺序很关键：foreign 优先（含"敌国"等强标志词），再边疆、封国、名胜、京城
    var order = ['foreign', 'frontier', 'fief', 'scenic', 'capital'];
    for (var i = 0; i < order.length; i++) {
      var t = order[i];
      var patterns = LOCATION_TYPE_KEYWORDS[t];
      if (!patterns) continue;
      for (var j = 0; j < patterns.length; j++) {
        if (patterns[j].test(s)) return t;
      }
    }
    // 玩家本职辖区（playerRole === prince 且封地与 loc 同名）→ fief
    try {
      var pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
      if (pi && pi.playerRole === 'prince' && pi.fiefName && s === pi.fiefName) {
        return LOCATION_TYPES.FIEF;
      }
    } catch (_) {}
    // 兜底：地方
    return LOCATION_TYPES.PROVINCE;
  }

  function discoverLocation(loc) {
    if (!_nonEmpty(loc)) return false;
    var st = _ensureState();
    if (!st) return false;
    if (st.discoveredLocations.indexOf(loc) !== -1) return false;
    st.discoveredLocations.push(loc); // arch-ok
    return true;
  }

  function setCurrentLocation(loc) {
    var st = _ensureState();
    if (!st) return false;
    st.currentLocation = loc || ''; // arch-ok
    // 同步玩家角色 location 字段（沿用 tm-char-full-schema.js）
    var ch = _player();
    if (ch) ch.location = loc || '';
    discoverLocation(loc);
    return true;
  }

  // ════════════════════════════════════════════════════════════
  //  §5 路径/距离/耗时计算（复用 tm-military MarchSystem）
  // ════════════════════════════════════════════════════════════

  // 计算路径距离与节点序列
  //   优先级：
  //     1. 剧本 hook：P.customRoutes[from→to] = { distance, path, terrain }
  //     2. 地图寻路：GM.mapData.adjacencyGraph + findPath
  //     3. 名称估算：同地=0·同名同区=1·含共同字=3·其余=8（领地单位）
  function computeRouteDistance(from, to, options) {
    options = options || {};
    var fromS = _nonEmpty(from) ? String(from) : '';
    var toS = _nonEmpty(to) ? String(to) : '';
    if (!fromS || !toS) return { distance: 0, path: [], source: 'invalid' };
    if (fromS === toS) return { distance: 0, path: [fromS], source: 'same' };

    // ① 剧本 hook
    try {
      if (typeof P !== 'undefined' && P && P.customRoutes) {
        var key1 = fromS + '→' + toS;
        var key2 = toS + '→' + fromS;
        var r = P.customRoutes[key1] || P.customRoutes[key2];
        if (r && typeof r === 'object') {
          return {
            distance: Number(r.distance) || 1,
            path: Array.isArray(r.path) ? r.path.slice() : [fromS, toS],
            terrain: r.terrain || '',
            source: 'custom-hook'
          };
        }
      }
    } catch (_) {}

    // ② 地图寻路：复用 tm-military 的 findPath
    try {
      var mapEnabled = (typeof P !== 'undefined' && P && P.map && P.map.enabled &&
                        typeof GM !== 'undefined' && GM.mapData && GM.mapData.adjacencyGraph);
      if (mapEnabled && typeof findPath === 'function') {
        var pr = findPath(fromS, toS, options.pathOptions || { avoidEnemy: true });
        if (pr && Array.isArray(pr.path) && pr.path.length > 1) {
          return {
            distance: pr.path.length,
            path: pr.path.slice(),
            hasPostRoad: !!pr.hasPostRoad,
            source: 'map-findPath'
          };
        }
      }
    } catch (_) {}

    // ③ 名称估算（兜底·朝代中立·与 MarchSystem 兜底同风格）
    var dist = _estimateDistanceByName(fromS, toS);
    return {
      distance: dist,
      path: [fromS, toS],
      source: 'name-estimate'
    };
  }

  function _estimateDistanceByName(from, to) {
    if (from === to) return 0;
    // 共同字符越多·距离越近
    var common = 0;
    for (var i = 0; i < from.length; i++) {
      if (to.indexOf(from.charAt(i)) !== -1) common++;
    }
    if (common >= Math.min(from.length, to.length)) return 2;
    if (common > 0) return 4;
    return 8;
  }

  // 估算移动耗时（回合数）·复用 MarchSystem 的 baseSpeeds 同口径
  //   mode.speed 是「领地/月」·distance 是「领地数」
  //   marchDays = ceil(distance * 30 / speed)
  //   marchTurns = max(1, ceil(marchDays / turnDays))
  function estimateTravelTime(from, to, mode, options) {
    options = options || {};
    var m = _resolveMode(mode);
    if (!m) return { days: 0, turns: 0, distance: 0, source: 'invalid-mode' };
    var route = computeRouteDistance(from, to, options);
    var distance = route.distance;
    if (distance <= 0) return { days: 0, turns: 0, distance: 0, source: route.source, route: route };

    var speed = m.speed;
    // 驿站方式：若有官道/驿路加成
    if (m.id === 'relay' || (route.hasPostRoad)) speed *= 1.4;
    // 舟船方式：若路线非水路·降级为步行速度（兜底）
    if (m.requiresWater && !_isWaterRoute(route, from, to)) speed = MODES.walk.speed;

    var days = Math.ceil(distance * 30 / Math.max(speed, 0.1));
    var turnDays = _turnDays();
    var turns = Math.max(1, Math.ceil(days / turnDays));

    // 随从规模加成（≥3 倍基础人数→慢一档）
    var entourageSize = options.entourageSize || 0;
    if (entourageSize > 50) turns = Math.ceil(turns * 1.2);
    if (entourageSize > 200) turns = Math.ceil(turns * 1.3);

    return {
      days: days,
      turns: turns,
      distance: distance,
      mode: m.id,
      route: route,
      source: route.source
    };
  }

  function _isWaterRoute(route, from, to) {
    if (!route) return false;
    var keywords = ['江', '河', '湖', '海', '水', '浦', '港', '渡', '溪', '川'];
    var s = (from || '') + (to || '') + (route.path || []).join('');
    for (var i = 0; i < keywords.length; i++) {
      if (s.indexOf(keywords[i]) !== -1) return true;
    }
    // 剧本 hook：P.waterRoutes[from→to] = true
    try {
      if (typeof P !== 'undefined' && P && P.waterRoutes) {
        var k1 = from + '→' + to, k2 = to + '→' + from;
        if (P.waterRoutes[k1] === true || P.waterRoutes[k2] === true) return true;
      }
    } catch (_) {}
    return false;
  }

  function _resolveMode(mode) {
    if (!_nonEmpty(mode)) return null;
    var id = _isStr(mode) ? mode : (mode.id || '');
    return MODES[id] || null;
  }

  // 估算移动成本（银钱 + 精力）
  function estimateTravelCost(from, to, mode, options) {
    options = options || {};
    var m = _resolveMode(mode);
    if (!m) return { money: 0, energy: 0, source: 'invalid-mode' };
    var route = computeRouteDistance(from, to, options);
    var distance = route.distance;
    var money = Math.ceil(distance * m.costPerTile);
    var energy = Math.ceil(distance * m.energyPerTile);

    // 随从成本加成（按规模·非简单线性）
    var entourageSize = options.entourageSize || 0;
    if (entourageSize > 0) {
      var scale = _entourageCostScale(entourageSize, m);
      money = Math.ceil(money * scale);
      energy = Math.ceil(energy * (1 + entourageSize * 0.005));
    }

    return {
      money: money,
      energy: energy,
      distance: distance,
      mode: m.id,
      entourageScale: entourageSize > 0 ? _entourageCostScale(entourageSize, m) : 1.0,
      source: route.source
    };
  }

  // 随从规模 → 成本倍率
  //   小队(≤10)：1.0
  //   中队(≤50)：1.3
  //   大队(≤200)：1.8
  //   庞大(>200)：2.5
  //   车驾/舟船方式对随从更友好（容量 mul 抵消部分加成）
  function _entourageCostScale(size, mode) {
    var s = Number(size) || 0;
    if (s <= 0) return 1.0;
    var base = 1.0;
    if (s <= 10) base = 1.0;
    else if (s <= 50) base = 1.3;
    else if (s <= 200) base = 1.8;
    else base = 2.5;
    var cap = (mode && mode.capacityMul) ? mode.capacityMul : 1.0;
    // 容量越大·加成衰减越多（最多衰减 30%）
    var attenuated = base - Math.min(0.3, (cap - 1.0) * 0.5);
    return Math.max(1.0, attenuated);
  }

  function computeEntourageCost(entourage, mode) {
    if (!entourage) return { size: 0, money: 0, energy: 0, scale: 1.0, breakdown: {} };
    var e = _normalizeEntourage(entourage);
    var size = e.total;
    var m = _resolveMode(mode) || MODES.walk;
    var scale = _entourageCostScale(size, m);
    return {
      size: size,
      scale: scale,
      mode: m.id,
      breakdown: e.breakdown
    };
  }

  function _normalizeEntourage(entourage) {
    if (!entourage) return { total: 0, breakdown: {} };
    if (typeof entourage === 'number') return { total: entourage, breakdown: { count: entourage } };
    var b = {
      family: 0,
      privateArmy: 0,
      caravan: 0,
      servants: 0,
      other: 0
    };
    if (typeof entourage === 'object') {
      b.family = Number(entourage.family) || 0;
      b.privateArmy = Number(entourage.privateArmy) || 0;
      b.caravan = Number(entourage.caravan) || 0;
      b.servants = Number(entourage.servants) || 0;
      b.other = Number(entourage.other) || Number(entourage.count) || 0;
    }
    var total = b.family + b.privateArmy + b.caravan + b.servants + b.other;
    return { total: total, breakdown: b };
  }

  // ════════════════════════════════════════════════════════════
  //  §6 移动方式：5 种方式 + 驿站官场关系校验
  // ════════════════════════════════════════════════════════════

  function getAllModes() {
    var out = {};
    Object.keys(MODES).forEach(function (k) { out[k] = Object.assign({}, MODES[k]); });
    return out;
  }

  function getModeConfig(mode) {
    var m = _resolveMode(mode);
    return m ? Object.assign({}, m) : null;
  }

  // 驿站方式需官场关系·返回 { can, score, reason }
  //   score >= RELAY_MIN_SCORE（默认 50）方可用驿站
  //   score 来源优先级：
  //     1. TM.PlayerInteraction.getOfficialRelation（若可用）
  //     2. P.playerInfo.officialRelation（剧本直挂）
  //     3. 玩家角色 rankLevel（品级越高·分数越高·正三品及以上可用）
  //     4. playerRole === emperor/regent/minister/general/prince 直通（身份合格）
  function canUseRelay(root) {
    var G = root || (typeof GM !== 'undefined' ? GM : null);
    var pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
    if (!pi) return { can: false, score: 0, reason: '玩家信息未就绪' };

    var RELAY_MIN_SCORE = 50;
    try { if (typeof P !== 'undefined' && P && typeof P.relayMinScore === 'number') RELAY_MIN_SCORE = P.relayMinScore; } catch (_) {}

    // 身份豁免·皇帝/摄政/朝臣/将领/诸侯本职即可使用驿站
    var role = pi.playerRole || '';
    if (role === 'emperor' || role === 'regent' || role === 'minister' ||
        role === 'general' || role === 'prince') {
      return { can: true, score: 100, reason: '身份合格·本职可用驿站', byRole: true };
    }

    var score = 0;
    var source = '';

    // ① TM.PlayerInteraction.getOfficialRelation
    try {
      if (TM && TM.PlayerInteraction && typeof TM.PlayerInteraction.getOfficialRelation === 'function') {
        score = Number(TM.PlayerInteraction.getOfficialRelation(G)) || 0;
        source = 'player-interaction';
      }
    } catch (_) {}

    // ② P.playerInfo.officialRelation
    if (!source && typeof pi.officialRelation === 'number') {
      score = pi.officialRelation;
      source = 'playerInfo.officialRelation';
    }

    // ③ 品级反推（rankLevel 1-9 为正三品以上·可用）
    if (!source) {
      var ch = _player(G);
      if (ch && typeof ch.rankLevel === 'number') {
        // rankLevel 1=最高·18=最低·正三品以上≈1-9
        score = Math.max(0, 100 - (ch.rankLevel - 1) * 5);
        source = 'rankLevel';
      }
    }

    if (!source) return { can: false, score: 0, reason: '官场关系不明·无法使用驿站' };

    if (score >= RELAY_MIN_SCORE) {
      return { can: true, score: score, reason: '官场关系合格', source: source };
    }
    return { can: false, score: score, reason: '官场关系不足·不可使用驿站', source: source, minRequired: RELAY_MIN_SCORE };
  }

  // ════════════════════════════════════════════════════════════
  //  §7 发起移动 + 推进 + 取消 + 到达
  // ════════════════════════════════════════════════════════════

  // travelTo(destination, mode, entourage) → { ok, reason, status, eta, cost, time }
  function travelTo(destination, mode, entourage) {
    var st = _ensureState();
    if (!st) return { ok: false, reason: '玩家状态未就绪' };
    if (!_nonEmpty(destination)) return { ok: false, reason: '目的地为空' };
    if (st.travelStatus && st.travelStatus.moving) {
      return { ok: false, reason: '已在移动中·不可重复发起' };
    }

    var m = _resolveMode(mode);
    if (!m) return { ok: false, reason: '未知移动方式：' + mode };

    // 驿站方式：官场关系校验
    if (m.requiresRelay) {
      var relayCheck = canUseRelay();
      if (!relayCheck.can) {
        return { ok: false, reason: relayCheck.reason, code: 'relay-denied', relay: relayCheck };
      }
    }

    // 舟船方式：水路校验
    if (m.requiresWater) {
      var route0 = computeRouteDistance(st.currentLocation, destination);
      if (!_isWaterRoute(route0, st.currentLocation, destination)) {
        return { ok: false, reason: '舟船方式需水路（路线无江/河/湖/海关键词）', code: 'no-water-route' };
      }
    }

    // 随从归一
    var ent = _normalizeEntourage(entourage);
    var entourageSize = ent.total;

    // 复用 MarchSystem 计算耗时
    var time = estimateTravelTime(st.currentLocation, destination, m, { entourageSize: entourageSize });
    if (time.turns <= 0 && time.distance > 0) {
      return { ok: false, reason: '路径计算异常' };
    }
    // 同地：直接到达
    if (time.distance === 0) {
      var sameLoc = st.currentLocation || destination;
      setCurrentLocation(destination);
      st.travelLog.push({ // arch-ok
        id: _uid(),
        from: sameLoc, to: destination, mode: m.id,
        startTurn: _turn(), endTurn: _turn(),
        days: 0, turns: 0, distance: 0,
        entourageSize: entourageSize,
        status: 'arrived',
        events: []
      });
      return { ok: true, status: 'arrived', reason: '已在目的地', location: destination };
    }

    // 成本估算
    var cost = estimateTravelCost(st.currentLocation, destination, m, { entourageSize: entourageSize });

    // 扣精力/银钱（如果挂接了经济系统）
    var spendResult = _spendMovementCost(cost);
    if (!spendResult.ok) {
      return { ok: false, reason: spendResult.reason, code: 'insufficient-funds', cost: cost };
    }

    // 写入移动状态
    var t = _turn();
    st.travelStatus = { // arch-ok
      moving: true,
      from: st.currentLocation,
      to: destination,
      mode: m.id,
      distance: time.distance,
      path: time.route.path || [st.currentLocation, destination],
      startTurn: t,
      progress: 0,
      totalTurns: time.turns,
      eta: t + time.turns,
      days: time.days,
      entourageSize: entourageSize,
      entourage: ent.breakdown,
      events: []
    };

    _addEB('移动', (st.currentLocation || '○') + ' → ' + destination + ' · ' + m.label +
                   ' · 路程 ' + time.distance + ' 领 · 耗时 ' + time.days + ' 日（' + time.turns + ' 回合）' +
                   ' · 路费 ' + cost.money + ' · 精力 -' + cost.energy +
                   (entourageSize > 0 ? ' · 随从 ' + entourageSize + ' 人' : ''));

    return {
      ok: true,
      status: 'moving',
      from: st.travelStatus.from,
      to: st.travelStatus.to,
      mode: m.id,
      modeLabel: m.label,
      distance: time.distance,
      days: time.days,
      turns: time.turns,
      eta: st.travelStatus.eta,
      cost: cost,
      entourage: { size: entourageSize, breakdown: ent.breakdown }
    };
  }

  function _spendMovementCost(cost) {
    // 银钱：TM.PlayerEconomy.spend 若可用则复用；否则写 P.playerInfo.money 临时账本
    var moneyOK = true;
    var energyOK = true;
    try {
      if (TM && TM.PlayerEconomy && typeof TM.PlayerEconomy.spend === 'function') {
        var r = TM.PlayerEconomy.spend(cost.money, { category: 'travel', note: '路费' });
        moneyOK = !!(r && r.ok);
      } else if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (typeof P.playerInfo.money !== 'number') P.playerInfo.money = 0; // arch-ok
        if (P.playerInfo.money < cost.money) {
          // 银钱不足：允许（透支标记）·不阻断（让上层 UI 决定是否阻止）
          P.playerInfo.money -= cost.money; // arch-ok
        } else {
          P.playerInfo.money -= cost.money; // arch-ok
        }
      }
    } catch (_) { moneyOK = false; }

    // 精力：_spendEnergy 若可用则复用；否则写 P.playerInfo.energy
    try {
      if (typeof _spendEnergy === 'function') {
        _spendEnergy(cost.energy);
      } else if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (typeof P.playerInfo.energy !== 'number') P.playerInfo.energy = 100; // arch-ok
        P.playerInfo.energy = Math.max(0, P.playerInfo.energy - cost.energy); // arch-ok
      }
    } catch (_) { energyOK = false; }

    return { ok: true, money: moneyOK, energy: energyOK };
  }

  // 每回合推进移动进度·由 endturn pipeline 调用
  function advanceTravel(root) {
    var st = _ensureState();
    if (!st) return { ok: false, reason: '玩家状态未就绪' };
    if (!st.travelStatus || !st.travelStatus.moving) return { ok: true, status: 'idle' };

    st.travelStatus.progress = (st.travelStatus.progress || 0) + 1; // arch-ok

    // 移动事件触发（每回合 30% 概率·可被剧本/上层覆盖）
    var evt = null;
    if (Math.random() < 0.3) {
      evt = triggerTravelEvent({ root: root, status: st.travelStatus });
      if (evt) {
        if (!Array.isArray(st.travelStatus.events)) st.travelStatus.events = []; // arch-ok
        st.travelStatus.events.push(evt); // arch-ok
      }
    }

    // 到达判定
    if (st.travelStatus.progress >= st.travelStatus.totalTurns) {
      return _arrive(st, root);
    }

    return {
      ok: true,
      status: 'moving',
      progress: st.travelStatus.progress,
      totalTurns: st.travelStatus.totalTurns,
      remaining: st.travelStatus.totalTurns - st.travelStatus.progress,
      event: evt
    };
  }

  function _arrive(st, root) {
    var ts = st.travelStatus;
    var from = ts.from;
    var to = ts.to;
    var mode = ts.mode;

    // 写入 location
    setCurrentLocation(to);

    // 自动发现目的地
    discoverLocation(to);

    // 关闭移动状态
    st.travelStatus = { // arch-ok
      moving: false,
      from: '',
      to: '',
      mode: '',
      eta: 0,
      startTurn: 0,
      progress: 0,
      totalTurns: 0,
      distance: 0,
      path: []
    };

    // 写入 travelLog
    st.travelLog.push({ // arch-ok
      id: _uid(),
      from: from, to: to, mode: mode,
      startTurn: ts.startTurn, endTurn: _turn(),
      days: ts.days || 0, turns: ts.totalTurns || 0,
      distance: ts.distance || 0,
      entourageSize: ts.entourageSize || 0,
      status: 'arrived',
      events: ts.events || []
    });

    _addEB('移动', '抵达 ' + to + ' · 共 ' + (ts.days || 0) + ' 日 / ' + (ts.totalTurns || 0) + ' 回合' +
                   (ts.events && ts.events.length ? ' · 路上 ' + ts.events.length + ' 件事' : ''));

    return {
      ok: true,
      status: 'arrived',
      from: from,
      to: to,
      mode: mode,
      events: ts.events || [],
      availableActions: getAvailableActions(to)
    };
  }

  function cancelTravel(root) {
    var st = _ensureState();
    if (!st) return { ok: false, reason: '玩家状态未就绪' };
    if (!st.travelStatus || !st.travelStatus.moving) {
      return { ok: false, reason: '当前未在移动中' };
    }
    var ts = st.travelStatus;
    var halfway = ts.progress > 0 && ts.progress >= Math.floor(ts.totalTurns / 2);
    // 半路取消：玩家停在路径中点
    var stopAt = halfway ? (ts.path[Math.floor(ts.path.length / 2)] || ts.from) : ts.from;
    setCurrentLocation(stopAt);
    st.travelStatus = { // arch-ok
      moving: false,
      from: '',
      to: '',
      mode: '',
      eta: 0,
      startTurn: 0,
      progress: 0,
      totalTurns: 0,
      distance: 0,
      path: []
    };
    _addEB('移动', '中途取消·停在 ' + stopAt);
    return { ok: true, status: 'cancelled', stopAt: stopAt };
  }

  // ════════════════════════════════════════════════════════════
  //  §8 携随从移动（家属/私军/商队）
  // ════════════════════════════════════════════════════════════

  // bringEntourage(entourage) → { ok, size, scale, breakdown, costMul }
  //   entourage: { family: N, privateArmy: N, caravan: N, servants: N, other: N }
  //   返回随从归一信息·供 travelTo(mode, entourage) 直接传入
  function bringEntourage(entourage) {
    var e = _normalizeEntourage(entourage);
    if (e.total <= 0) {
      return { ok: false, reason: '随从为空', size: 0, breakdown: e.breakdown };
    }
    return {
      ok: true,
      size: e.total,
      breakdown: e.breakdown,
      costMul: 1.0  // 实际倍率由 estimateTravelCost(entourageSize) 计算
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §9 移动事件（盗匪/天气/偶遇 NPC/发现古迹 · LLM 生成 + 降级 mock）
  // ════════════════════════════════════════════════════════════

  // triggerTravelEvent(ctx) → { type, title, text, effect, source }
  //   ctx: { root, status, mode, from, to, forceType }
  //   事件类型按权重随机选择（盗匪 25% / 天气 30% / 偶遇 25% / 古迹 20%）
  //   LLM 可用：尝试调用 callAI(prompt, maxTokens)·失败则降级 mock
  function triggerTravelEvent(ctx) {
    ctx = ctx || {};
    var st = _ensureState();
    if (!st) return null;
    var ts = ctx.status || st.travelStatus || {};
    var from = ctx.from || ts.from || '';
    var to = ctx.to || ts.to || '';
    var mode = ctx.mode || ts.mode || 'walk';

    var type = ctx.forceType || _pickEventType();
    var title = _eventTitle(type);
    var prompt = _buildEventPrompt(type, from, to, mode, ts);

    // 尝试 LLM
    var llmText = '';
    var source = 'mock';
    try {
      if (typeof callAI === 'function') {
        // 同步降级路径：callAI 在浏览器侧通常返回 Promise·此处包成同步占位
        //   真实部署建议在 endturn pipeline 中 await callAI 后再写事件文本
        var maybe = null;
        try { maybe = callAI(prompt, 200); } catch (_) { maybe = null; }
        if (maybe && typeof maybe === 'string' && maybe.trim()) {
          llmText = maybe.trim();
          source = 'llm';
        } else if (maybe && typeof maybe.then === 'function') {
          // Promise：返回降级 mock·真正 LLM 结果由 pipeline 异步写回
          source = 'mock-llm-async';
        }
      }
    } catch (_) {}

    if (!llmText) {
      llmText = _pick(_EVENT_MOCK_TEMPLATES[type] || _EVENT_MOCK_TEMPLATES.encounter);
      source = source === 'mock-llm-async' ? source : 'mock';
    }

    var effect = _eventEffect(type, mode);

    var evt = {
      id: _uid(),
      type: type,
      title: title,
      text: llmText,
      effect: effect,
      from: from,
      to: to,
      mode: mode,
      turn: _turn(),
      source: source
    };
    return evt;
  }

  function _pickEventType() {
    var r = Math.random();
    if (r < 0.25) return EVENT_TYPES.BANDIT;
    if (r < 0.55) return EVENT_TYPES.WEATHER;
    if (r < 0.80) return EVENT_TYPES.ENCOUNTER;
    return EVENT_TYPES.RELIC;
  }

  function _eventTitle(type) {
    switch (type) {
      case EVENT_TYPES.BANDIT:    return '路遇盗匪';
      case EVENT_TYPES.WEATHER:   return '天时不济';
      case EVENT_TYPES.ENCOUNTER: return '道上偶遇';
      case EVENT_TYPES.RELIC:     return '寻得古迹';
      default:                    return '途中之事';
    }
  }

  function _buildEventPrompt(type, from, to, mode, ts) {
    var typeLabel = _eventTitle(type);
    var modeLabel = (MODES[mode] && MODES[mode].label) || mode;
    var lines = [
      '【玩家移动事件】',
      '事件类型：' + typeLabel,
      '起点：' + (from || '○'),
      '终点：' + (to || '○'),
      '移动方式：' + modeLabel,
      '请用 80-120 字描述此次路上事件，要求：',
      '- 朝代中立·不挂任何朝代专属建制名',
      '- 贴合事件类型与移动方式',
      '- 给出一句简短后果（银钱/精力/关系/属性轻微影响）'
    ];
    if (ts && ts.entourageSize > 0) lines.push('随从规模：' + ts.entourageSize + ' 人');
    return lines.join('\n');
  }

  function _eventEffect(type, mode) {
    // 朝代中立·通用效果模板
    switch (type) {
      case EVENT_TYPES.BANDIT:
        return { money: -10, energy: -3, valor: +1, note: '盗匪掠去银钱·随从略有损伤' };
      case EVENT_TYPES.WEATHER:
        return { energy: -2, days: +1, note: '天气恶劣·耽搁时日' };
      case EVENT_TYPES.ENCOUNTER:
        return { charisma: +1, relation: +1, note: '偶遇相契之人·略增人脉' };
      case EVENT_TYPES.RELIC:
        return { learning: +1, benevolence: +1, note: '访得古迹·略增见识' };
      default:
        return { note: '路上无事' };
    }
  }

  // ════════════════════════════════════════════════════════════
  //  §10 地点决定动作集
  // ════════════════════════════════════════════════════════════

  function getActionsForLocation(loc) {
    var type = classifyLocation(loc);
    var list = ACTIONS_BY_LOCATION[type] || ACTIONS_BY_LOCATION.province;
    return list.slice();
  }

  // 同义别名·保持 API 命名直观
  function getAvailableActions(loc) {
    return getActionsForLocation(loc);
  }

  // ════════════════════════════════════════════════════════════
  //  §11 御案"移动"面板（显示地图与可去地点）
  // ════════════════════════════════════════════════════════════

  // renderMovementPanel(targetEl) → 渲染移动面板 HTML 字符串
  //   targetEl 可选·若传入则把 innerHTML 写入并返回 null；否则返回 HTML 字符串
  function renderMovementPanel(targetEl) {
    var st = _ensureState();
    if (!st) return targetEl ? null : '<div class="mv-panel-empty">玩家状态未就绪</div>';

    var current = st.currentLocation || '○';
    var ts = st.travelStatus || {};
    var discovered = st.discoveredLocations || [];
    var modeKeys = Object.keys(MODES);

    var h = '<div class="mv-panel" id="mvPanel">';
    h += '<div class="mv-panel-head">';
    h += '<span class="mv-panel-title">' + _icon('compass', 14) + ' 自由移动</span>';
    h += '<span class="mv-current">现居：<b>' + _esc(current) + '</b></span>';
    h += '</div>';

    // 移动状态
    if (ts.moving) {
      var pct = ts.totalTurns ? Math.floor((ts.progress / ts.totalTurns) * 100) : 0;
      h += '<div class="mv-status mv-moving">';
      h += '<div class="mv-status-line">';
      h += '<span>' + _esc(ts.from || '') + ' → ' + _esc(ts.to || '') + '</span>';
      h += '<span class="mv-mode">' + _esc((MODES[ts.mode] && MODES[ts.mode].label) || ts.mode) + '</span>';
      h += '</div>';
      h += '<div class="mv-progress"><div class="mv-progress-bar" style="width:' + pct + '%"></div></div>';
      h += '<div class="mv-status-meta">进度 ' + ts.progress + '/' + ts.totalTurns + ' 回合 · 预计第 ' + ts.eta + ' 回合抵达</div>';
      h += '<div class="mv-status-actions">';
      h += '<button type="button" class="bt bs mv-btn-cancel" data-action="cancel">' + _icon('cancel', 12) + ' 中途折返</button>';
      h += '</div>';
      h += '</div>';
    } else {
      h += '<div class="mv-status mv-idle">当前未在移动·可发起一次远行</div>';
    }

    // 地点分类动作集
    var locType = classifyLocation(current);
    var actions = getActionsForLocation(current);
    h += '<div class="mv-actions">';
    h += '<div class="mv-section-title">此地可为之事（' + _esc(_locTypeLabel(locType)) + '）</div>';
    if (actions.length === 0) {
      h += '<div class="mv-empty">此地暂无可为之事</div>';
    } else {
      h += '<div class="mv-action-grid">';
      actions.forEach(function (a) {
        h += '<button type="button" class="bt bs mv-action-btn" data-action="' + _esc(a.id) + '" data-label="' + _esc(a.label) + '">' + _esc(a.label) + '</button>';
      });
      h += '</div>';
    }
    h += '</div>';

    // 发起移动
    if (!ts.moving) {
      h += '<div class="mv-travel">';
      h += '<div class="mv-section-title">发起远行</div>';
      // 目的地输入 + 候选
      h += '<div class="mv-dest-row">';
      h += '<input type="text" id="mvDestInput" class="mv-input" placeholder="目的地（可从已发现地点选）" list="mvDestList" />';
      h += '<datalist id="mvDestList">';
      discovered.forEach(function (d) {
        if (d && d !== current) h += '<option value="' + _esc(d) + '"></option>';
      });
      h += '</datalist>';
      h += '</div>';

      // 移动方式
      h += '<div class="mv-mode-row">';
      h += '<div class="mv-mode-label">移动方式：</div>';
      h += '<div class="mv-mode-grid">';
      modeKeys.forEach(function (k) {
        var m = MODES[k];
        var relayNote = m.requiresRelay ? ' · 需官场关系' : '';
        var waterNote = m.requiresWater ? ' · 需水路' : '';
        h += '<label class="mv-mode-opt">';
        h += '<input type="radio" name="mvMode" value="' + _esc(k) + '"' + (k === 'walk' ? ' checked' : '') + ' />';
        h += '<span class="mv-mode-text">' + _esc(m.label) + '<small>速 ' + m.speed + ' · 银 ' + m.costPerTile + relayNote + waterNote + '</small></span>';
        h += '</label>';
      });
      h += '</div>';
      h += '</div>';

      // 随从
      h += '<div class="mv-entourage-row">';
      h += '<div class="mv-entourage-label">携带随从（可选）：</div>';
      h += '<div class="mv-entourage-grid">';
      h += '<label>家属 <input type="number" id="mvEntFamily" min="0" value="0" class="mv-num" /></label>';
      h += '<label>私军 <input type="number" id="mvEntArmy" min="0" value="0" class="mv-num" /></label>';
      h += '<label>商队 <input type="number" id="mvEntCaravan" min="0" value="0" class="mv-num" /></label>';
      h += '<label>仆从 <input type="number" id="mvEntServants" min="0" value="0" class="mv-num" /></label>';
      h += '</div>';
      h += '</div>';

      // 行动按钮
      h += '<div class="mv-travel-actions">';
      h += '<button type="button" class="bt bp mv-btn-go" data-action="go">' + _icon('route', 12) + ' 启程</button>';
      h += '<button type="button" class="bt bs mv-btn-estimate" data-action="estimate">估算路费/耗时</button>';
      h += '</div>';
      h += '<div class="mv-estimate" id="mvEstimateBox"></div>';
      h += '</div>';
    }

    // 已发现地点
    h += '<div class="mv-discovered">';
    h += '<div class="mv-section-title">已发现地点（' + discovered.length + '）</div>';
    if (discovered.length === 0) {
      h += '<div class="mv-empty">尚未发现任何地点</div>';
    } else {
      h += '<ul class="mv-disc-list">';
      discovered.forEach(function (d) {
        var t = classifyLocation(d);
        h += '<li><span class="mv-disc-loc">' + _esc(d) + '</span><span class="mv-disc-type">' + _esc(_locTypeLabel(t)) + '</span></li>';
      });
      h += '</ul>';
    }
    h += '</div>';

    h += '</div>';

    // 内嵌样式（与 tm-transmigration.js 同风格·朝代中立的暗金主调）
    h += '<style>' +
      '.mv-panel{padding:0.8rem 1rem;background:linear-gradient(90deg,rgba(22,15,8,0.84),rgba(40,28,14,0.70) 46%,rgba(15,10,6,0.82));border:1px solid rgba(215,185,104,0.30);border-radius:3px;font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;}' +
      '.mv-panel-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(215,185,104,0.30);padding-bottom:0.4rem;margin-bottom:0.6rem;}' +
      '.mv-panel-title{color:var(--gold-400);letter-spacing:0.2em;font-size:1.05rem;}' +
      '.mv-current{color:var(--color-foreground-secondary);font-size:0.85rem;}' +
      '.mv-status{padding:0.5rem 0.7rem;background:var(--color-sunken);border-radius:var(--radius-md);margin-bottom:0.6rem;font-size:0.85rem;}' +
      '.mv-moving{border-left:3px solid var(--gold-400);}' +
      '.mv-status-line{display:flex;justify-content:space-between;margin-bottom:0.3rem;}' +
      '.mv-mode{color:var(--gold-400);}' +
      '.mv-progress{height:6px;background:rgba(0,0,0,0.4);border-radius:3px;overflow:hidden;margin:0.3rem 0;}' +
      '.mv-progress-bar{height:100%;background:linear-gradient(90deg,var(--gold-500),var(--gold-400));transition:width 0.3s;}' +
      '.mv-status-meta{font-size:0.78rem;color:var(--color-foreground-muted);}' +
      '.mv-status-actions{margin-top:0.4rem;}' +
      '.mv-idle{color:var(--color-foreground-muted);font-style:italic;}' +
      '.mv-actions{margin-bottom:0.7rem;}' +
      '.mv-section-title{font-size:0.85rem;color:var(--gold-400);letter-spacing:0.15em;margin-bottom:0.3rem;padding-left:0.4rem;border-left:2px solid var(--gold-500);}' +
      '.mv-action-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(110px,1fr));gap:0.3rem;}' +
      '.mv-action-grid button{font-size:0.78rem;padding:0.25rem 0.4rem;}' +
      '.mv-travel{padding-top:0.5rem;border-top:1px dashed rgba(215,185,104,0.25);margin-bottom:0.6rem;}' +
      '.mv-input{width:100%;padding:0.3rem 0.5rem;background:var(--color-sunken);border:1px solid var(--color-border-subtle);border-radius:2px;color:var(--color-foreground);font-family:inherit;font-size:0.85rem;margin-bottom:0.4rem;}' +
      '.mv-mode-row{margin-bottom:0.4rem;}' +
      '.mv-mode-label{font-size:0.78rem;color:var(--color-foreground-secondary);margin-bottom:0.2rem;}' +
      '.mv-mode-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:0.3rem;}' +
      '.mv-mode-opt{display:flex;align-items:center;gap:0.3rem;padding:0.25rem 0.4rem;background:var(--color-sunken);border-radius:2px;cursor:pointer;font-size:0.8rem;}' +
      '.mv-mode-text{display:flex;flex-direction:column;}' +
      '.mv-mode-text small{font-size:0.7rem;color:var(--color-foreground-muted);}' +
      '.mv-entourage-row{margin-bottom:0.5rem;}' +
      '.mv-entourage-label{font-size:0.78rem;color:var(--color-foreground-secondary);margin-bottom:0.2rem;}' +
      '.mv-entourage-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:0.3rem;font-size:0.75rem;}' +
      '.mv-entourage-grid label{display:flex;flex-direction:column;gap:0.2rem;color:var(--color-foreground-muted);}' +
      '.mv-num{width:100%;padding:0.2rem;background:var(--color-sunken);border:1px solid var(--color-border-subtle);border-radius:2px;color:var(--color-foreground);font-family:inherit;font-size:0.8rem;}' +
      '.mv-travel-actions{display:flex;gap:0.4rem;margin-top:0.4rem;}' +
      '.mv-estimate{margin-top:0.4rem;font-size:0.78rem;color:var(--color-foreground-secondary);min-height:1rem;}' +
      '.mv-discovered{margin-top:0.4rem;}' +
      '.mv-disc-list{list-style:none;padding:0;margin:0;}' +
      '.mv-disc-list li{display:flex;justify-content:space-between;padding:0.2rem 0.4rem;border-bottom:1px dashed rgba(215,185,104,0.15);font-size:0.8rem;}' +
      '.mv-disc-type{color:var(--gold-400);font-size:0.7rem;}' +
      '.mv-empty{color:var(--color-foreground-muted);font-style:italic;padding:0.4rem;font-size:0.8rem;}' +
      '</style>';

    if (targetEl && typeof targetEl === 'object') {
      try { targetEl.innerHTML = h; return null; } catch (_) { return h; }
    }
    return h;
  }

  function _locTypeLabel(t) {
    var map = {
      capital:  '京城',
      province: '地方',
      fief:     '封国',
      frontier: '边疆',
      scenic:   '名胜',
      foreign:  '敌国化外'
    };
    return map[t] || '地方';
  }

  // ════════════════════════════════════════════════════════════
  //  §12 导出
  // ════════════════════════════════════════════════════════════

  TM.PlayerMovement = {
    // 常量
    MODES: MODES,
    LOCATION_TYPES: LOCATION_TYPES,
    ACTIONS_BY_LOCATION: ACTIONS_BY_LOCATION,
    EVENT_TYPES: EVENT_TYPES,

    // 状态查询
    getState: getState,
    getCurrentLocation: getCurrentLocation,
    getTravelStatus: getTravelStatus,
    getDiscoveredLocations: getDiscoveredLocations,
    isTraveling: isTraveling,

    // 地点管理
    classifyLocation: classifyLocation,
    discoverLocation: discoverLocation,
    setCurrentLocation: setCurrentLocation,
    getActionsForLocation: getActionsForLocation,
    getAvailableActions: getAvailableActions,

    // 移动方式
    getAllModes: getAllModes,
    getModeConfig: getModeConfig,
    canUseRelay: canUseRelay,

    // 路径/耗时/成本
    computeRouteDistance: computeRouteDistance,
    estimateTravelTime: estimateTravelTime,
    estimateTravelCost: estimateTravelCost,

    // 移动主流程
    travelTo: travelTo,
    advanceTravel: advanceTravel,
    cancelTravel: cancelTravel,

    // 随从
    bringEntourage: bringEntourage,
    computeEntourageCost: computeEntourageCost,

    // 移动事件
    triggerTravelEvent: triggerTravelEvent,

    // 御案面板
    renderMovementPanel: renderMovementPanel
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = TM.PlayerMovement;
  }
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
