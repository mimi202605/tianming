// ============================================================
// tm-player-family.js — 穿越模式 Phase 4.5 · Task 19 玩家家族与子女系统
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（具体禁词清单
//   见 lint 规则与项目铁律文档），一律由剧本 hook 处理。
//   「冠礼/及笄」「满月/启蒙」是中国古代通用礼制，跨朝代通用，本引擎层保留。
//   科举/荫袭/征辟 是中国古代通用选官制度，跨朝代通用，本引擎层保留。
//   科场具体名目（明清专属）由剧本 hook。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerFamily.{
//   CHILD_STAGES, GROWTH_EVENTS, EDUCATION_MODES, CAREER_PATHS, CRISIS_TYPES,
//   getState, getFamilyTree, getMembers, getChildren, getSpouse, getParents, getSiblings, getClan,
//   addMember, removeMember, setChildCustody,
//   marry, birthChild, tickGrowth, triggerGrowthEvent,
//   educateChild, marryChild, appointChild, inherit,
//   checkCrisis, triggerCrisis, triggerDefection,
//   writeFamilyEvent, renderFamilyPanel
// }
// 依赖（运行时软依赖，缺席时降级）：
//   - TM.PlayerInteraction.interact(npcName, 'marry', payload)  联姻
//   - TM.PlayerMarriage.*                                        婚姻礼制
//   - TM.PlayerEconomy.spend / getBalance                        银钱
//   - TM.Transmigration.isTransmigrationMode                     模式判定
//   - addEB / ChronicleTracker / NpcMemorySystem                 事件写入
//   - findCharByName / canonicalizeCharName                      角色查找
//   - global.callAI / callLLM                                    LLM 适配
// 双路径挂载：浏览器走 window.TM.PlayerFamily；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  // ════════════════════════════════════════════════════════════
  //  §1 常量
  // ════════════════════════════════════════════════════════════

  // 子女成长阶段
  var CHILD_STAGES = {
    INFANT: 'infant',  // 婴幼 0-3
    CHILD:  'child',   // 童蒙 4-12
    YOUTH:  'youth',   // 少年 13-15
    ADULT:  'adult'    // 成年 16+（冠礼/及笄后）
  };

  // 成长事件·年龄单位"年"·每阶段触发
  //   manyue 满月（出生后 0.1 年≈1 月）
  //   qimeng 启蒙（5 岁·开蒙读书）
  //   jili   及笄（女 15 岁·笄礼成·可议婚）
  //   guanli 冠礼（男 20 岁·冠礼成·可议婚/出仕）
  var GROWTH_EVENTS = [
    { key: 'manyue',  label: '满月', age: 0.1, gender: null },
    { key: 'qimeng',  label: '启蒙', age: 5,   gender: null },
    { key: 'jili',    label: '及笄', age: 15,  gender: '女' },
    { key: 'guanli',  label: '冠礼', age: 20,  gender: '男' }
  ];

  // 教育方式
  var EDUCATION_MODES = {
    HIRE_TUTOR: { key: 'hire_tutor', label: '延师',     cost: 500,  learning: +6, intelligence: +4, benevolence: +2 },
    SELF_TEACH: { key: 'self_teach', label: '亲自教导', cost: 0,    learning: +3, intelligence: +2, benevolence: +5 },
    ACADEMY:    { key: 'academy',    label: '送书院',   cost: 1000, learning: +8, intelligence: +6, benevolence: +1 }
  };

  // 出仕路径·科举/荫袭/征辟·跨朝代通用选官制度
  var CAREER_PATHS = {
    KEJU:   { key: 'keju',   label: '科举', requireLearning: 60, desc: '应科考出身' },
    YINXI:  { key: 'yinxi',  label: '荫袭', requireParentRank: true, desc: '承父祖恩荫' },
    ZHENGPI:{ key: 'zhengpi', label: '征辟', requireFame: 50, desc: '受征召入仕' }
  };

  // 子嗣危机类型
  var CRISIS_TYPES = {
    NO_HEIR:      'no_heir',      // 绝嗣
    SUCCESSION:   'succession',   // 夺嫡
    DEFECTION:    'defection'     // 叛逃
  };

  // 子女继承基线·家产/官职/名望的继承比例
  var INHERIT_RATIOS = {
    wealth: 0.7,    // 子女继承玩家 70% 私财
    fame:   0.5,    // 子女继承玩家 50% 名望
    office: true    // 子女继承官职（荫袭路径）
  };

  // 子女叛逃阈值：与玩家关系达「仇敌」级（enemy ≥ 80）
  var DEFECTION_ENEMY_THRESHOLD = 80;

  // ════════════════════════════════════════════════════════════
  //  §2 工具函数
  // ════════════════════════════════════════════════════════════

  function _isStr(v) { return typeof v === 'string'; }
  function _clamp(n, lo, hi) { return Math.max(lo, Math.min(hi, n)); }
  function _pick(arr) { return arr.length ? arr[Math.floor(Math.random() * arr.length)] : ''; }
  function _turn() {
    try { if (typeof GM !== 'undefined' && GM && typeof GM.turn === 'number') return GM.turn; } catch (_) {}
    return 0;
  }
  function _turnsPerYear() {
    try {
      if (typeof getTurnDays === 'function') {
        var d = getTurnDays(); if (d && d > 0) return 365 / d;
      }
    } catch (_) {}
    return 12; // 默认 1 回合 = 1 月·12 回合 = 1 年
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

  function _findChar(name) {
    if (!name) return null;
    try { if (typeof findCharByName === 'function') return findCharByName(name); } catch (_) {}
    try {
      if (typeof GM !== 'undefined' && GM && Array.isArray(GM.chars)) {
        for (var i = 0; i < GM.chars.length; i++) {
          var c = GM.chars[i];
          if (c && c.name === name) return c;
        }
      }
    } catch (_) {}
    return null;
  }

  function _canonName(name) {
    if (!name) return name;
    try { if (typeof canonicalizeCharName === 'function') return canonicalizeCharName(name) || name; } catch (_) {}
    return name;
  }

  function _playerChar() {
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return null;
      var name = P.playerInfo.characterName;
      if (!name) return null;
      return _findChar(name);
    } catch (_) {}
    return null;
  }

  function _playerName() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.characterName) {
        return P.playerInfo.characterName;
      }
    } catch (_) {}
    return '';
  }

  function _playerFamilyName() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.familyName) {
        return P.playerInfo.familyName;
      }
    } catch (_) {}
    var pc = _playerChar();
    return (pc && pc.family) || '';
  }

  // ── LLM 调用（运行时真实·缺席/mock 降级）──
  function _callLLM(prompt) {
    try { if (typeof global.callAI === 'function') return global.callAI(prompt); } catch (_) {}
    try { if (typeof callLLM === 'function') return callLLM(prompt); } catch (_) {}
    return null;
  }

  // ── 银钱消耗：复用 TM.PlayerEconomy ──
  function _spendCash(amount, reason) {
    try {
      if (global.TM && global.TM.PlayerEconomy && typeof global.TM.PlayerEconomy.spend === 'function') {
        var r = global.TM.PlayerEconomy.spend(amount, reason);
        return !!(r && r.ok);
      }
    } catch (_) {}
    return true;
  }

  function _hasCash(amount) {
    try {
      if (global.TM && global.TM.PlayerEconomy && typeof global.TM.PlayerEconomy.getBalance === 'function') {
        return global.TM.PlayerEconomy.getBalance() >= amount;
      }
    } catch (_) {}
    return true;
  }

  // ── 时间推进 / 精力消耗：复用 TM.PlayerInteraction ──
  function _advanceTime(hours) {
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction._advanceTime === 'function') {
        return global.TM.PlayerInteraction._advanceTime(hours);
      }
    } catch (_) {}
    return { turnAdvanced: false };
  }
  function _spendEnergy(cost, label) {
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction._spendEnergyLocal === 'function') {
        return global.TM.PlayerInteraction._spendEnergyLocal(cost, label);
      }
    } catch (_) {}
    return true;
  }

  // ── 事件日志 / 编年史 / 玩家记忆 ──
  function _addEB(cat, txt) {
    try { if (typeof addEB === 'function') { addEB(cat, txt); return; } } catch (_) {}
    try { console.log('[PlayerFamily][' + cat + ']', txt); } catch (_) {}
  }
  function _chronicle(track) {
    try {
      if (typeof ChronicleTracker !== 'undefined' && ChronicleTracker && typeof ChronicleTracker.add === 'function') {
        return ChronicleTracker.add(track);
      }
    } catch (_) {}
    return null;
  }
  function _writePlayerMemory(entry) {
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return;
      if (!Array.isArray(P.playerInfo._playerMemory)) P.playerInfo._playerMemory = []; // arch-ok
      P.playerInfo._playerMemory.push(entry); // arch-ok
      if (P.playerInfo._playerMemory.length > 200) {
        P.playerInfo._playerMemory = P.playerInfo._playerMemory.slice(-200); // arch-ok
      }
    } catch (_) {}
  }
  function _writeNpcMemory(npcName, event, mood, importance, who) {
    try {
      if (typeof NpcMemorySystem !== 'undefined' && NpcMemorySystem && typeof NpcMemorySystem.remember === 'function') {
        NpcMemorySystem.remember(npcName, event, mood, importance, who, { type: 'player_family' });
      }
    } catch (_) {}
  }

  // ── 角色家族成员复用 tm-char-full-schema.js 的 familyMembers 字段 ──
  //   familyMembers[i] = { relation, name, age, dead, ... }
  //   本模块在玩家角色上额外维护 _playerFamilyState（GM._playerFamily）记录子女动态

  // ════════════════════════════════════════════════════════════
  //  §3 状态读写（玩家家族状态挂在 GM._playerFamily）
  // ════════════════════════════════════════════════════════════

  function _defaultState() {
    return {
      members: [],     // 家族成员清单（除子女外：父母/兄弟/姐妹/配偶/宗族）
                       //  { relation: '父'|'母'|'兄'|'弟'|'姐'|'妹'|'配偶'|'宗亲', name, age, dead, note }
      children: [],    // 子女清单·核心
                       //  { name, gender, age, stage, learning, intelligence, benevolence,
                       //    mother, birthTurn, isHeir, dead, marriedTo, career, growthEvents: [], stepParentRels: [] }
      events: [],      // 家族事件史
      crises: [],      // 危机记录（绝嗣/夺嫡/叛逃）
      tree: null       // 缓存的家族树
    };
  }

  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerFamily) {
        GM._playerFamily = _defaultState(); // arch-ok
      }
      return GM._playerFamily;
    } catch (_) {}
    return null;
  }

  function _ensureState() {
    var s = _getState();
    if (!s) return null;
    if (!Array.isArray(s.members)) s.members = [];
    if (!Array.isArray(s.children)) s.children = [];
    if (!Array.isArray(s.events)) s.events = [];
    if (!Array.isArray(s.crises)) s.crises = [];
    return s;
  }

  function _pushEvent(s, kind, label, name, note) {
    s.events.push({
      turn: _turn(),
      kind: kind,
      label: label,
      name: name || '',
      note: note || ''
    });
    if (s.events.length > 100) s.events = s.events.slice(-100);
  }

  // 子女命名兜底（LLM 缺席时）
  function _genChildName(opts) {
    opts = opts || {};
    var familyName = _playerFamilyName() || '';
    var gender = opts.gender || '男';
    var poolMale = ['承宗', '承嗣', '明远', '致远', '弘文', '怀瑾', '景仁', '景义', '延祚', '延庆'];
    var poolFemale = ['淑慎', '静姝', '婉清', '惠心', '端敏', '徽音', '令仪', '静婉', '蕙兰', '琼华'];
    var pool = gender === '女' ? poolFemale : poolMale;
    var given = _pick(pool);
    return familyName + given;
  }

  // ════════════════════════════════════════════════════════════
  //  §4 玩家家族结构
  // ════════════════════════════════════════════════════════════

  function addMember(relation, name, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    if (!relation) return { ok: false, reason: '未指定关系' };
    if (!name) return { ok: false, reason: '未指定姓名' };
    var m = {
      relation: relation,
      name: name,
      age: opts.age || null,
      dead: !!opts.dead,
      note: opts.note || '',
      addedAt: _turn()
    };
    s.members.push(m);
    _pushEvent(s, 'add_member', '添加家族成员', name, relation + (opts.note ? '·' + opts.note : ''));

    // 同步写入玩家角色的 familyMembers（若可访问）
    try {
      var pc = _playerChar();
      if (pc) {
        if (!Array.isArray(pc.familyMembers)) pc.familyMembers = [];
        pc.familyMembers.push({ relation: relation, name: name, age: opts.age, dead: !!opts.dead });
      }
    } catch (_) {}

    return { ok: true, member: m };
  }

  function removeMember(name) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var before = s.members.length;
    s.members = s.members.filter(function (m) { return m.name !== name; });
    if (s.members.length === before) return { ok: false, reason: '未找到成员：' + name };
    _pushEvent(s, 'remove_member', '移除家族成员', name, '');
    return { ok: true };
  }

  // 移除子女（从 s.children·用于 smoke/测试重置或剧情事件）
  function removeChild(name) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var before = s.children.length;
    s.children = s.children.filter(function (c) { return c.name !== name; });
    if (s.children.length === before) return { ok: false, reason: '未找到子女：' + name };
    // 同步从 GM.chars 移除（保持与 birthChild 注册对偶）
    try {
      if (GM && Array.isArray(GM.chars)) {
        GM.chars = GM.chars.filter(function (c) { return c && c.name !== name; }); // arch-ok
      }
    } catch (_) {}
    _pushEvent(s, 'remove_child', '移除子女记录', name, '');
    return { ok: true };
  }

  function getMembers() {
    var s = _ensureState();
    return s ? JSON.parse(JSON.stringify(s.members)) : [];
  }
  function getChildren() {
    var s = _ensureState();
    return s ? JSON.parse(JSON.stringify(s.children)) : [];
  }

  function _findChild(name) {
    var s = _ensureState();
    if (!s) return null;
    for (var i = 0; i < s.children.length; i++) {
      if (s.children[i].name === name) return s.children[i];
    }
    return null;
  }

  function getParents() {
    var s = _ensureState();
    if (!s) return [];
    return s.members.filter(function (m) { return m.relation === '父' || m.relation === '母'; });
  }
  function getSiblings() {
    var s = _ensureState();
    if (!s) return [];
    return s.members.filter(function (m) {
      return ['兄', '弟', '姐', '妹'].indexOf(m.relation) >= 0;
    });
  }
  function getSpouse() {
    var s = _ensureState();
    if (!s) return null;
    var sp = s.members.find(function (m) { return m.relation === '配偶'; });
    return sp ? JSON.parse(JSON.stringify(sp)) : null;
  }
  function getClan() {
    var s = _ensureState();
    if (!s) return [];
    return s.members.filter(function (m) { return m.relation === '宗亲'; });
  }

  // 家族树（结构化）
  function getFamilyTree() {
    var s = _ensureState();
    if (!s) return null;
    var pc = _playerChar();
    return {
      player: {
        name: _playerName(),
        title: (pc && (pc.officialTitle || pc.title)) || '',
        family: _playerFamilyName()
      },
      parents: getParents(),
      siblings: getSiblings(),
      spouse:  getSpouse(),
      children: s.children.map(function (c) {
        return {
          name: c.name,
          gender: c.gender,
          age: c.age,
          stage: c.stage,
          isHeir: !!c.isHeir,
          dead: !!c.dead,
          marriedTo: c.marriedTo || '',
          career: c.career || ''
        };
      }),
      clan: getClan()
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §5 结婚（委托 TM.PlayerInteraction + TM.PlayerMarriage）
  // ════════════════════════════════════════════════════════════

  function marry(npcName, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    if (!npcName) return { ok: false, reason: '未指定对象' };

    var npcCh = _findChar(npcName);
    if (!npcCh) return { ok: false, reason: '未找到对象：' + npcName };

    // 1) 委托 PlayerInteraction.interact 完成 NPC 层联姻
    var marryRes = null;
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction.interact === 'function') {
        marryRes = global.TM.PlayerInteraction.interact(npcName, 'marry', { dowry: opts.dowry || 0 });
      }
    } catch (_) {}

    // 2) 家族成员清单写入配偶
    var s = _ensureState();
    if (s) {
      // 移除旧配偶记录（若有）
      s.members = s.members.filter(function (m) { return m.relation !== '配偶'; });
      s.members.push({
        relation: '配偶',
        name: _canonName(npcName),
        age: npcCh.age || null,
        dead: false,
        note: '嫁妆：' + (opts.dowry || 0),
        addedAt: _turn()
      });
      _pushEvent(s, 'marry', '成婚', npcName, '嫁妆：' + (opts.dowry || 0));
    }

    // 3) 婚姻礼制 hook（若 PlayerMarriage 可用·走其流程）
    var marriageRes = null;
    if (opts.skipMarriageRites !== true) {
      try {
        if (global.TM && global.TM.PlayerMarriage && typeof global.TM.PlayerMarriage.proposeMarriage === 'function') {
          // 这里不自动跑完六礼·只标个起始态供剧本推进
          // 真实六礼流程由 PlayerMarriage 单独驱动
        }
      } catch (_) {}
    }

    writeFamilyEvent({
      kind: 'marry',
      label: '成婚',
      name: npcName,
      note: '嫁妆：' + (opts.dowry || 0)
    });

    return {
      ok: true,
      npc: npcName,
      marriage: marryRes,
      marriageRites: marriageRes,
      hint: '已与' + npcName + '联姻；如需走完整六礼，请使用 TM.PlayerMarriage.proposeMarriage'
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §6 生育子女
  // ════════════════════════════════════════════════════════════

  function birthChild(opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };

    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };

    // 配偶校验（须有配偶）
    var spouse = getSpouse();
    if (!spouse && !opts.allowBastard) {
      return { ok: false, reason: '须先成婚方可生育（或显式传 opts.allowBastard）' };
    }

    var gender = opts.gender || (Math.random() < 0.5 ? '男' : '女');
    var name = opts.name || _genChildName({ gender: gender });
    var mother = opts.mother || (spouse ? spouse.name : '');

    var child = {
      name: name,
      gender: gender,
      age: 0,
      ageAccumulator: 0,
      stage: CHILD_STAGES.INFANT,
      learning: 30,
      intelligence: 40 + Math.floor(Math.random() * 20), // 40-60
      benevolence: 50,
      mother: mother,
      birthTurn: _turn(),
      isHeir: false,
      dead: false,
      marriedTo: '',
      career: '',
      growthEvents: [],
      stepParentRels: []
    };

    // 第一个【婚生】子女默认为继承人（庶子/私生 allowBastard 不入嫡统）
    if (s.children.length === 0 && !opts.allowBastard) child.isHeir = true;

    s.children.push(child);

    // 同步注册到 GM.chars（子女亦是角色·供 NPC 关系/记忆/叛逃判定等系统寻获）
    try {
      if (GM && Array.isArray(GM.chars)) {
        var exists = false;
        for (var k = 0; k < GM.chars.length; k++) {
          if (GM.chars[k] && GM.chars[k].name === name) { exists = true; break; }
        }
        if (!exists) {
          GM.chars.push({ // arch-ok (子女注册至 GM.chars·与 inherit 的 switchToHeir 对偶)
            name: name,
            alive: true,
            gender: gender,
            officialTitle: '',
            role: '子女',
            age: 0,
            family: _playerFamilyName()
          }); // arch-ok (子女角色注册·剧情可后续覆盖)
        }
      }
    } catch (_) {}

    _pushEvent(s, 'birth', '生育子女', name, gender + '·母' + (mother || '○'));

    // 触发满月事件（推到 0.1 岁·约 1 月）
    _scheduleGrowthEvent(child, 'manyue');

    writeFamilyEvent({
      kind: 'birth',
      label: '生育子女',
      name: name,
      note: gender + '·母' + (mother || '○')
    });

    return { ok: true, child: JSON.parse(JSON.stringify(child)) };
  }

  // ════════════════════════════════════════════════════════════
  //  §7 子女成长
  // ════════════════════════════════════════════════════════════

  // 每回合推进·子女年龄 +mr/12·到成长事件阈值时触发
  function tickGrowth(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };

    var mr = opts.monthsPerTurn || 1;
    var triggered = [];

    for (var i = 0; i < s.children.length; i++) {
      var ch = s.children[i];
      if (!ch || ch.dead) continue;

      // 年龄推进
      ch.ageAccumulator = (ch.ageAccumulator || 0) + mr / 12;
      while (ch.ageAccumulator >= 1) {
        ch.age += 1;
        ch.ageAccumulator -= 1;
      }

      // 阶段更新
      var newStage = _stageForAge(ch.age, ch.gender);
      if (newStage !== ch.stage) {
        ch.stage = newStage;
      }

      // 成长事件触发检查
      for (var j = 0; j < GROWTH_EVENTS.length; j++) {
        var evt = GROWTH_EVENTS[j];
        if (evt.gender && evt.gender !== ch.gender) continue;
        if (ch.age < evt.age) continue;
        if (ch.growthEvents.indexOf(evt.key) >= 0) continue;
        // 触发
        var trig = triggerGrowthEvent(ch.name, evt.key);
        if (trig.ok) triggered.push(trig);
      }
    }

    return { ok: true, triggered: triggered };
  }

  function _stageForAge(age, gender) {
    if (age < 4) return CHILD_STAGES.INFANT;
    if (age < 13) return CHILD_STAGES.CHILD;
    if (age < 16) return CHILD_STAGES.YOUTH;
    return CHILD_STAGES.ADULT;
  }

  function _scheduleGrowthEvent(child, evtKey) {
    // 标记已调度·由 tickGrowth 在到龄时触发
    if (child.growthEvents.indexOf(evtKey) >= 0) return;
    // 满月是出生即触发的特殊事件·直接触发
    if (evtKey === 'manyue') {
      child.growthEvents.push(evtKey);
      _pushEvent(_ensureState(), 'growth_manyue', '满月', child.name, '');
    }
  }

  function triggerGrowthEvent(childName, evtKey) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var ch = _findChild(childName);
    if (!ch) return { ok: false, reason: '未找到子女：' + childName };
    if (ch.dead) return { ok: false, reason: '子女已不在人世' };

    var evt = GROWTH_EVENTS.find(function (e) { return e.key === evtKey; });
    if (!evt) return { ok: false, reason: '未知成长事件：' + evtKey };
    if (evt.gender && evt.gender !== ch.gender) {
      return { ok: false, reason: '性别不符：' + evt.label + '仅限' + evt.gender };
    }
    if (ch.growthEvents.indexOf(evtKey) >= 0) {
      return { ok: false, reason: '已触发过：' + evt.label };
    }
    if (ch.age < evt.age) {
      return { ok: false, reason: '年龄不足：需 ' + evt.age + ' 岁，当前 ' + ch.age + ' 岁' };
    }

    ch.growthEvents.push(evtKey);

    // 成年礼效果：冠礼/及笄 → stage = ADULT + 属性加成 + 可议婚
    if (evtKey === 'guanli' || evtKey === 'jili') {
      ch.stage = CHILD_STAGES.ADULT;
      ch.benevolence = _clamp((ch.benevolence || 50) + 5, 0, 100);
      ch.learning = _clamp((ch.learning || 30) + 5, 0, 100);
    }
    // 启蒙效果：learning +
    if (evtKey === 'qimeng') {
      ch.learning = _clamp((ch.learning || 30) + 8, 0, 100);
    }

    _pushEvent(s, 'growth_' + evtKey, evt.label, childName, '');

    writeFamilyEvent({
      kind: 'growth_' + evtKey,
      label: evt.label,
      name: childName,
      note: '年 ' + ch.age + '岁'
    });

    return {
      ok: true,
      child: JSON.parse(JSON.stringify(ch)),
      event: evt
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §8 子女教育
  // ════════════════════════════════════════════════════════════

  function educateChild(childName, modeKey, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var ch = _findChild(childName);
    if (!ch) return { ok: false, reason: '未找到子女：' + childName };
    if (ch.dead) return { ok: false, reason: '子女已不在人世' };

    var mode = EDUCATION_MODES[(modeKey || '').toUpperCase()] || EDUCATION_MODES.SELF_TEACH;
    if (mode.cost > 0 && !_hasCash(mode.cost)) {
      return { ok: false, reason: '银钱不足（需 ' + mode.cost + ' 两·' + mode.label + '）' };
    }

    if (mode.cost > 0) _spendCash(mode.cost, '教育·' + mode.label);
    _advanceTime(2);
    _spendEnergy(1, '教育·' + mode.label);

    ch.learning = _clamp((ch.learning || 30) + mode.learning, 0, 100);
    ch.intelligence = _clamp((ch.intelligence || 50) + mode.intelligence, 0, 100);
    ch.benevolence = _clamp((ch.benevolence || 50) + mode.benevolence, 0, 100);

    _pushEvent(s, 'educate', '子女教育', childName, mode.label + '·学识→' + ch.learning);

    writeFamilyEvent({
      kind: 'educate',
      label: '子女教育·' + mode.label,
      name: childName,
      note: '学识 ' + ch.learning + '·智力 ' + ch.intelligence + '·仁厚 ' + ch.benevolence
    });

    return {
      ok: true,
      child: JSON.parse(JSON.stringify(ch)),
      mode: mode
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §9 子女联姻（成年子女与 NPC 家族联姻）
  // ════════════════════════════════════════════════════════════

  function marryChild(childName, npcName, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var ch = _findChild(childName);
    if (!ch) return { ok: false, reason: '未找到子女：' + childName };
    if (ch.dead) return { ok: false, reason: '子女已不在人世' };
    if (ch.marriedTo) return { ok: false, reason: '子女已成婚：当前配偶 ' + ch.marriedTo };

    // 须成年（冠礼/及笄后）
    if (ch.stage !== CHILD_STAGES.ADULT) {
      return { ok: false, reason: '子女未达议婚年龄（须冠礼/及笄后），当前阶段：' + ch.stage };
    }

    var npcCh = _findChar(npcName);
    if (!npcCh) return { ok: false, reason: '未找到 NPC：' + npcName };
    if (npcCh.alive === false) return { ok: false, reason: 'NPC 已不在人世' };

    // 调用 PlayerInteraction 完成 NPC 层联姻（familyAlliances / 5 维 friend）
    var marryRes = null;
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction.interact === 'function') {
        marryRes = global.TM.PlayerInteraction.interact(npcName, 'marry', { dowry: opts.dowry || 0 });
      }
    } catch (_) {}

    ch.marriedTo = _canonName(npcName);
    _pushEvent(s, 'child_marry', '子女联姻', childName, '与 ' + npcName);

    writeFamilyEvent({
      kind: 'child_marry',
      label: '子女联姻',
      name: childName,
      note: '与 ' + npcName + '·嫁妆 ' + (opts.dowry || 0)
    });

    return {
      ok: true,
      child: JSON.parse(JSON.stringify(ch)),
      marriage: marryRes
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §10 子女出仕（科举/荫袭/征辟）
  // ════════════════════════════════════════════════════════════

  function appointChild(childName, pathKey, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var ch = _findChild(childName);
    if (!ch) return { ok: false, reason: '未找到子女：' + childName };
    if (ch.dead) return { ok: false, reason: '子女已不在人世' };
    if (ch.career) return { ok: false, reason: '子女已出仕：' + ch.career };

    var path = CAREER_PATHS[(pathKey || '').toUpperCase()] || CAREER_PATHS.KEJU;

    // 须成年
    if (ch.stage !== CHILD_STAGES.ADULT) {
      return { ok: false, reason: '子女未达出仕年龄，当前阶段：' + ch.stage };
    }

    // 路径条件校验
    if (path.key === 'keju' && (ch.learning || 0) < path.requireLearning) {
      return { ok: false, reason: '学识不足（需 ' + path.requireLearning + '·当前 ' + (ch.learning || 0) + '）' };
    }
    if (path.key === 'zhengpi') {
      var fame = _playerFame();
      if (fame < path.requireFame) {
        return { ok: false, reason: '家族名望不足（需 ' + path.requireFame + '·当前 ' + fame + '）' };
      }
    }
    if (path.key === 'yinxi') {
      var pc = _playerChar();
      if (!pc || !pc.officialTitle) {
        return { ok: false, reason: '荫袭须玩家有官职在身' };
      }
    }

    ch.career = path.label + '出身';

    // 出仕效果：智力 + / 名望 +
    ch.intelligence = _clamp((ch.intelligence || 50) + 5, 0, 100);

    _pushEvent(s, 'appoint', '子女出仕', childName, path.label);

    writeFamilyEvent({
      kind: 'appoint',
      label: '子女出仕·' + path.label,
      name: childName,
      note: path.desc
    });

    // 编年史
    _chronicle({
      type: 'player_family',
      category: '家族',
      title: '子女出仕·' + path.label,
      narrative: childName + '以' + path.label + '入仕',
      actor: childName,
      stakeholders: [childName],
      sourceType: 'player_family',
      sourceId: 'appoint_' + _turn(),
      priority: 'medium'
    });

    return {
      ok: true,
      child: JSON.parse(JSON.stringify(ch)),
      path: path
    };
  }

  function _playerFame() {
    try {
      var pc = _playerChar();
      if (pc && pc.resources && typeof pc.resources.fame === 'number') return pc.resources.fame;
    } catch (_) {}
    return 50;
  }

  // ════════════════════════════════════════════════════════════
  //  §11 子女继承（玩家死亡/罢黜时）
  // ════════════════════════════════════════════════════════════

  function inherit(heirName, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var heir = _findChild(heirName);
    if (!heir) return { ok: false, reason: '未找到继承人：' + heirName };
    if (heir.dead) return { ok: false, reason: '继承人已不在人世' };

    var pc = _playerChar();
    if (!pc) return { ok: false, reason: '玩家角色未就绪' };

    var reason = opts.reason || '死亡'; // 死亡 / 罢黜
    var inherited = {
      wealth: 0,
      fame: 0,
      office: false,
      familyName: _playerFamilyName()
    };

    // 1) 家产继承（私财比例）
    try {
      if (pc.resources && pc.resources.privateWealth) {
        inherited.wealth = Math.floor((pc.resources.privateWealth.money || 0) * INHERIT_RATIOS.wealth);
      }
    } catch (_) {}

    // 2) 名望继承
    try {
      if (pc.resources && typeof pc.resources.fame === 'number') {
        inherited.fame = Math.floor(pc.resources.fame * INHERIT_RATIOS.fame);
      }
    } catch (_) {}

    // 3) 官职继承（荫袭路径，须玩家有官职且继承人已出仕）
    if (INHERIT_RATIOS.office && pc.officialTitle && heir.career) {
      inherited.office = true;
      inherited.officeTitle = pc.officialTitle;
    }

    // 4) 继承人标记
    s.children.forEach(function (c) {
      c.isHeir = (c.name === heirName);
    });

    // 5) 切换玩家角色（可选·opts.switchToHeir=true 时）
    var switched = false;
    if (opts.switchToHeir) {
      try {
        if (typeof P !== 'undefined' && P && P.playerInfo) {
          P.playerInfo.characterName = heir.name; // arch-ok (玩家角色切换·剧本可后续覆盖)
          P.playerInfo.characterTitle = inherited.office ? inherited.officeTitle : (heir.career || ''); // arch-ok
          switched = true;
        }
      } catch (_) {}
      try {
        if (pc) pc.isPlayer = false; // 旧玩家退场 // arch-ok
        var heirCh = _findChar(heir.name);
        if (!heirCh && GM && Array.isArray(GM.chars)) {
          // 继承人不在 GM.chars（子女仅登记于家族子树）·注册为新玩家角色
          heirCh = {
            name: heir.name,
            alive: true,
            gender: heir.gender || '男',
            officialTitle: inherited.office ? inherited.officeTitle : '',
            role: '宗嗣',
            isPlayer: false,
            resources: { fame: inherited.fame, privateWealth: { money: inherited.wealth } },
            family: _playerFamilyName(),
            age: heir.age || 0
          };
          GM.chars.push(heirCh); // arch-ok (玩家角色继承注册·剧情可后续覆盖)
        }
        if (heirCh) heirCh.isPlayer = true; // arch-ok
      } catch (_) {}
    }

    _pushEvent(s, 'inherit', '子女继承', heirName, '由' + reason + '·继家产/官职/名望');

    writeFamilyEvent({
      kind: 'inherit',
      label: '子女继承',
      name: heirName,
      note: '因' + reason + '·继银' + inherited.wealth + '·名望' + inherited.fame + (inherited.office ? '·继官职' : '')
    });

    return {
      ok: true,
      heir: JSON.parse(JSON.stringify(heir)),
      inherited: inherited,
      switched: switched,
      reason: reason
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §12 子嗣危机（绝嗣 / 夺嫡）
  // ════════════════════════════════════════════════════════════

  function checkCrisis() {
    var s = _ensureState();
    if (!s) return null;
    var living = s.children.filter(function (c) { return !c.dead; });

    // 绝嗣：无活着的子女
    if (living.length === 0) {
      return triggerCrisis(CRISIS_TYPES.NO_HEIR, {
        severity: 'critical',
        message: '玩家无子在世·绝嗣危机·家业将无所归'
      });
    }

    // 夺嫡：活着的成年男性 ≥ 2 且未明确继承人
    var adultMales = living.filter(function (c) {
      return c.gender === '男' && c.stage === CHILD_STAGES.ADULT;
    });
    if (adultMales.length >= 2) {
      var hasHeir = living.some(function (c) { return c.isHeir; });
      if (!hasHeir) {
        return triggerCrisis(CRISIS_TYPES.SUCCESSION, {
          severity: 'warning',
          message: '成年子 ' + adultMales.length + ' 人·未定继承人·夺嫡内斗风险',
          candidates: adultMales.map(function (c) { return c.name; })
        });
      }
    }

    return null;
  }

  function triggerCrisis(crisisType, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return null;

    var crisis = {
      id: 'crisis_' + crisisType + '_' + _turn() + '_' + Math.random().toString(36).slice(2, 6),
      type: crisisType,
      turn: _turn(),
      severity: opts.severity || 'warning',
      message: opts.message || '',
      candidates: opts.candidates || [],
      resolved: false
    };
    s.crises.push(crisis);
    if (s.crises.length > 30) s.crises = s.crises.slice(-30);

    _pushEvent(s, 'crisis_' + crisisType, '危机·' + _crisisLabel(crisisType), '', opts.message);

    writeFamilyEvent({
      kind: 'crisis_' + crisisType,
      label: '危机·' + _crisisLabel(crisisType),
      name: '',
      note: opts.message
    });

    return crisis;
  }

  function _crisisLabel(t) {
    if (t === CRISIS_TYPES.NO_HEIR) return '绝嗣';
    if (t === CRISIS_TYPES.SUCCESSION) return '夺嫡';
    if (t === CRISIS_TYPES.DEFECTION) return '叛逃';
    return '未知';
  }

  // ════════════════════════════════════════════════════════════
  //  §13 子女叛逃（关系恶化到仇敌级）
  // ════════════════════════════════════════════════════════════

  function checkDefection(opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return null;
    var playerName = _playerName();
    if (!playerName) return null;

    var defected = [];
    for (var i = 0; i < s.children.length; i++) {
      var ch = s.children[i];
      if (!ch || ch.dead) continue;
      if (ch.defected) continue;
      // 读子女对玩家的 enemy 维
      var enemyLevel = _childEnemyLevel(ch, playerName);
      if (enemyLevel >= DEFECTION_ENEMY_THRESHOLD) {
        var trig = triggerDefection(ch.name, { reason: '与玩家关系恶化至仇敌级（enemy=' + enemyLevel + '）' });
        if (trig.ok) defected.push(trig);
      }
    }
    return defected.length ? defected : null;
  }

  function _childEnemyLevel(child, playerName) {
    try {
      var childCh = _findChar(child.name);
      if (!childCh) return 0;
      if (childCh._playerRelDims && childCh._playerRelDims[playerName]) {
        return childCh._playerRelDims[playerName].enemy || 0;
      }
      if (childCh.relations && childCh.relations[playerName]) {
        return childCh.relations[playerName].hostility || 0;
      }
    } catch (_) {}
    return 0;
  }

  function triggerDefection(childName, opts) {
    opts = opts || {};
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var ch = _findChild(childName);
    if (!ch) return { ok: false, reason: '未找到子女：' + childName };
    if (ch.dead) return { ok: false, reason: '子女已不在人世' };
    if (ch.defected) return { ok: false, reason: '子女已叛逃' };

    ch.defected = true;
    ch.isHeir = false;

    var crisis = triggerCrisis(CRISIS_TYPES.DEFECTION, {
      severity: 'critical',
      message: '子女 ' + childName + ' 叛逃·' + (opts.reason || '')
    });

    _pushEvent(s, 'defection', '子女叛逃', childName, opts.reason || '');

    writeFamilyEvent({
      kind: 'defection',
      label: '子女叛逃',
      name: childName,
      note: opts.reason || ''
    });

    return {
      ok: true,
      child: JSON.parse(JSON.stringify(ch)),
      crisis: crisis
    };
  }

  // ════════════════════════════════════════════════════════════
  //  §14 子女归属（供 PlayerMarriage 调用）
  // ════════════════════════════════════════════════════════════

  function setChildCustody(prevSpouseName, custody) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    var updated = 0;
    for (var i = 0; i < s.children.length; i++) {
      var ch = s.children[i];
      if (!ch) continue;
      // 仅更新母为 prevSpouseName 的子女
      if (ch.mother === prevSpouseName) {
        ch.custody = custody; // '父' | '母' // arch-ok
        updated += 1;
      }
    }
    if (updated > 0) {
      _pushEvent(s, 'custody', '子女归属判定', prevSpouseName, '归：' + custody + '·' + updated + ' 子女');
    }
    return { ok: true, updated: updated };
  }

  // 继父母关系绑定（供 PlayerMarriage.remarry 调用·直接修改真实状态）
  function bindStepParent(spouseName, relation) {
    var s = _ensureState();
    if (!s) return { ok: false, reason: '状态未就绪' };
    if (!spouseName) return { ok: false, reason: '未指定继父母' };
    var rel = relation || '继母';
    var bound = 0;
    for (var i = 0; i < s.children.length; i++) {
      var ch = s.children[i];
      if (!ch || ch.dead) continue;
      if (!ch.stepParentRels) ch.stepParentRels = []; // arch-ok
      var existing = null;
      for (var j = 0; j < ch.stepParentRels.length; j++) {
        if (ch.stepParentRels[j].spouseName === spouseName) { existing = ch.stepParentRels[j]; break; }
      }
      if (existing) continue;
      ch.stepParentRels.push({ spouseName: spouseName, relation: rel, boundAt: _turn() }); // arch-ok
      bound += 1;
    }
    if (bound > 0) {
      _pushEvent(s, 'stepparent', '继父母关系绑定', spouseName, rel + '·' + bound + ' 子女');
    }
    return { ok: true, bound: bound, relation: rel };
  }

  // ════════════════════════════════════════════════════════════
  //  §15 家族事件写入玩家记忆与编年史
  // ════════════════════════════════════════════════════════════

  function writeFamilyEvent(evt) {
    if (!evt) return null;
    var entry = {
      turn: _turn(),
      kind: evt.kind || 'family_event',
      label: evt.label || '',
      name: evt.name || '',
      note: evt.note || '',
      ts: (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0
    };

    _writePlayerMemory(entry);

    if (entry.name) {
      var mood = /叛逃|夺嫡|绝嗣|危机|死/.test(entry.label + entry.note) ? '恨' : '喜';
      var imp = /生育|继承|出仕|冠礼|及笄/.test(entry.label) ? 9 : 6;
      _writeNpcMemory(entry.name, entry.label + '·' + entry.note, mood, imp, '玩家');
    }

    _chronicle({
      type: 'player_family',
      category: '家族',
      title: entry.label,
      narrative: entry.note,
      actor: '玩家',
      stakeholders: entry.name ? [entry.name] : [],
      sourceType: 'player_family',
      sourceId: entry.kind + '_' + entry.turn,
      priority: 'high'
    });

    _addEB('家族', entry.label + (entry.name ? '·' + entry.name : '') + (entry.note ? '（' + entry.note + '）' : ''));

    return entry;
  }

  // ════════════════════════════════════════════════════════════
  //  §16 御案"家族"面板
  // ════════════════════════════════════════════════════════════

  function renderFamilyPanel() {
    var s = _ensureState();
    if (!s) return '<div class="pf-panel">家族状态未就绪</div>';

    var tree = getFamilyTree();
    var h = '<div class="pf-panel" style="padding:0.6rem;border:1px solid var(--ink-200);border-radius:4px;">';
    h += '<div style="font-weight:600;margin-bottom:0.4rem;">家族';

    // 婚姻子面板（嵌入）
    var marriagePanel = '';
    try {
      if (global.TM && global.TM.PlayerMarriage && typeof global.TM.PlayerMarriage.renderMarriagePanel === 'function') {
        marriagePanel = global.TM.PlayerMarriage.renderMarriagePanel();
      }
    } catch (_) {}
    if (marriagePanel) {
      h += '<span style="float:right;font-weight:400;font-size:0.85em;">含婚姻子面板</span>';
    }
    h += '</div>';

    // 玩家
    h += '<div style="margin-bottom:0.4rem;">';
    h += '<span style="color:var(--txt-d);">家主：</span>';
    h += '<span>' + (tree.player.name || '○') + (tree.player.title ? '（' + tree.player.title + '）' : '') + '</span>';
    if (tree.player.family) h += '<span style="color:var(--txt-d);font-size:0.85em;margin-left:0.4rem;">' + tree.player.family + '</span>';
    h += '</div>';

    // 父母
    if (tree.parents.length) {
      h += '<div style="margin-bottom:0.3rem;font-size:0.9em;">';
      h += '<span style="color:var(--txt-d);">父母：</span>';
      h += tree.parents.map(function (m) { return m.relation + '·' + m.name + (m.dead ? '（故）' : ''); }).join('，');
      h += '</div>';
    }

    // 兄弟姐妹
    if (tree.siblings.length) {
      h += '<div style="margin-bottom:0.3rem;font-size:0.9em;">';
      h += '<span style="color:var(--txt-d);">同胞：</span>';
      h += tree.siblings.map(function (m) { return m.relation + '·' + m.name + (m.dead ? '（故）' : ''); }).join('，');
      h += '</div>';
    }

    // 配偶
    if (tree.spouse) {
      h += '<div style="margin-bottom:0.3rem;font-size:0.9em;">';
      h += '<span style="color:var(--txt-d);">配偶：</span>';
      h += tree.spouse.name + (tree.spouse.note ? '（' + tree.spouse.note + '）' : '');
      h += '</div>';
    }

    // 子女列表
    h += '<div style="margin-top:0.4rem;border-top:1px dashed var(--ink-200);padding-top:0.4rem;">';
    h += '<div style="font-weight:600;font-size:0.9em;margin-bottom:0.3rem;">子女（' + tree.children.length + '）</div>';
    if (!tree.children.length) {
      h += '<div style="color:var(--txt-d);font-size:0.85em;">尚无子女</div>';
    } else {
      h += '<ul style="margin:0;padding:0 0 0 1rem;font-size:0.88em;">';
      tree.children.forEach(function (c) {
        var tags = [];
        if (c.isHeir) tags.push('继承人');
        if (c.dead) tags.push('已故');
        if (c.marriedTo) tags.push('婚 ' + c.marriedTo);
        if (c.career) tags.push(c.career);
        if (c.stage) tags.push(c.stage);
        h += '<li>' + c.name + '（' + (c.gender || '?') + '·' + (c.age != null ? c.age + '岁' : '') + '）'
          + (tags.length ? ' <span style="color:var(--txt-d);font-size:0.85em;">[' + tags.join('·') + ']</span>' : '')
          + '</li>';
      });
      h += '</ul>';
    }
    h += '</div>';

    // 宗亲
    if (tree.clan.length) {
      h += '<details style="margin-top:0.3rem;"><summary style="cursor:pointer;font-size:0.85em;color:var(--txt-d);">宗亲（' + tree.clan.length + '）</summary>';
      h += '<ul style="margin:0.2rem 0 0 1rem;padding:0;font-size:0.85em;">';
      tree.clan.forEach(function (m) {
        h += '<li>' + m.name + (m.note ? '·' + m.note : '') + (m.dead ? '（故）' : '') + '</li>';
      });
      h += '</ul></details>';
    }

    // 危机
    if (s.crises && s.crises.length) {
      var lastCrisis = s.crises[s.crises.length - 1];
      if (!lastCrisis.resolved) {
        h += '<div style="margin-top:0.4rem;padding:0.3rem;background:var(--bg-danger);border-radius:3px;color:var(--txt-danger);">';
        h += '<div style="font-size:0.85em;">家族危机</div>';
        h += '<div>' + lastCrisis.message + '</div>';
        h += '</div>';
      }
    }

    // 婚姻子面板嵌入
    if (marriagePanel) {
      h += '<div style="margin-top:0.4rem;border-top:1px dashed var(--ink-200);padding-top:0.4rem;">';
      h += marriagePanel;
      h += '</div>';
    }

    // 可选家族动作
    h += '<div style="margin-top:0.5rem;border-top:1px dashed var(--ink-200);padding-top:0.4rem;">';
    h += '<div style="font-size:0.85em;color:var(--txt-d);margin-bottom:0.3rem;">可选动作</div>';
    h += '<div style="display:flex;flex-wrap:wrap;gap:0.3rem;">';
    h += '<button class="bt bs" onclick="TM.PlayerFamily._uiMarry()">议婚</button>';
    h += '<button class="bt bs" onclick="TM.PlayerFamily._uiBirthChild()">生育</button>';
    h += '<button class="bt bs" onclick="TM.PlayerFamily._uiEducateChild()">教导子女</button>';
    h += '</div>';
    h += '</div>';

    // 家族史
    if (s.events.length) {
      h += '<details style="margin-top:0.4rem;"><summary style="cursor:pointer;font-size:0.85em;color:var(--txt-d);">家族史（' + s.events.length + '）</summary>';
      h += '<ul style="margin:0.2rem 0 0 1rem;padding:0;font-size:0.85em;">';
      s.events.slice(-10).forEach(function (e) {
        h += '<li>T' + e.turn + '·' + e.label + (e.name ? '·' + e.name : '') + (e.note ? '（' + e.note + '）' : '') + '</li>';
      });
      h += '</ul></details>';
    }

    h += '</div>';
    return h;
  }

  // ════════════════════════════════════════════════════════════
  //  §16.1 UI 钩子（2026-07-21·仿 PlayerMarriage C2 模式·让面板可玩）
  //    历史根因：renderFamilyPanel 只显示状态·玩家无法手动触发议婚/生育/教导。
  //    修复：showPrompt 收参数 → 调内部 API → toast 反馈 → refreshAll 刷面板。
  // ════════════════════════════════════════════════════════════
  function _refreshPanel() {
    try {
      if (global.TM && global.TM.PlayerShell && typeof global.TM.PlayerShell.refreshAll === 'function') {
        global.TM.PlayerShell.refreshAll();
      }
    } catch (_) {}
  }

  function _uiMarry() {
    if (!_isTransmigration()) { if (typeof toast === 'function') toast('非穿越模式'); return; }
    var s = _ensureState();
    if (!s) { if (typeof toast === 'function') toast('家族状态未就绪'); return; }
    if (typeof showPrompt !== 'function') {
      _addEB('家族', 'showPrompt 缺席·请在剧本面板中选择议婚对象');
      return;
    }
    showPrompt('议婚对象姓名（须为已登记 NPC）：', '', function (name) {
      if (!name) return;
      var r = marry(name, {});
      if (r.ok) {
        if (typeof toast === 'function') toast('已与「' + name + '」成婚');
      } else {
        if (typeof toast === 'function') toast('议婚失败：' + (r.reason || '未知'));
      }
      _refreshPanel();
    });
  }

  function _uiBirthChild() {
    if (!_isTransmigration()) { if (typeof toast === 'function') toast('非穿越模式'); return; }
    var r = birthChild({});
    if (r.ok) {
      var ch = r.child || {};
      if (typeof toast === 'function') toast('生育子女「' + (ch.name || '') + '」·' + (ch.gender || ''));
    } else {
      if (typeof toast === 'function') toast('生育失败：' + (r.reason || '未知'));
    }
    _refreshPanel();
  }

  function _uiEducateChild() {
    if (!_isTransmigration()) { if (typeof toast === 'function') toast('非穿越模式'); return; }
    var s = _ensureState();
    if (!s) { if (typeof toast === 'function') toast('家族状态未就绪'); return; }
    if (typeof showPrompt !== 'function') {
      _addEB('家族', 'showPrompt 缺席·请在剧本面板中指定子女与教导方式');
      return;
    }
    showPrompt('子女名:教导方式（hire_tutor 延师 / self_teach 亲教 / academy 书院·默认 self_teach）：', '', function (input) {
      if (!input) return;
      var parts = input.split(':');
      var childName = (parts[0] || '').trim();
      var modeKey = (parts[1] || 'self_teach').trim();
      if (!childName) { if (typeof toast === 'function') toast('未指定子女名'); return; }
      var r = educateChild(childName, modeKey, {});
      if (r.ok) {
        var ch = r.child || {}, mode = r.mode || {};
        if (typeof toast === 'function') toast('已教导「' + childName + '」·' + (mode.label || '') + '·学识 ' + (ch.learning || 0));
      } else {
        if (typeof toast === 'function') toast('教导失败：' + (r.reason || '未知'));
      }
      _refreshPanel();
    });
  }

  // ════════════════════════════════════════════════════════════
  //  §17 查询接口
  // ════════════════════════════════════════════════════════════

  function getState() {
    var s = _ensureState();
    if (!s) return null;
    return JSON.parse(JSON.stringify(s));
  }

  // ════════════════════════════════════════════════════════════
  //  §18 导出
  // ════════════════════════════════════════════════════════════

  var ns = {
    CHILD_STAGES: CHILD_STAGES,
    GROWTH_EVENTS: GROWTH_EVENTS,
    EDUCATION_MODES: EDUCATION_MODES,
    CAREER_PATHS: CAREER_PATHS,
    CRISIS_TYPES: CRISIS_TYPES,
    INHERIT_RATIOS: INHERIT_RATIOS,

    // 状态查询
    getState: getState,
    getFamilyTree: getFamilyTree,
    getMembers: getMembers,
    getChildren: getChildren,
    getParents: getParents,
    getSiblings: getSiblings,
    getSpouse: getSpouse,
    getClan: getClan,

    // 家族成员管理
    addMember: addMember,
    removeMember: removeMember,
    removeChild: removeChild,
    setChildCustody: setChildCustody,
    bindStepParent: bindStepParent,

    // 结婚 / 生育 / 成长 / 教育
    marry: marry,
    birthChild: birthChild,
    tickGrowth: tickGrowth,
    triggerGrowthEvent: triggerGrowthEvent,
    educateChild: educateChild,

    // 子女联姻 / 出仕 / 继承
    marryChild: marryChild,
    appointChild: appointChild,
    inherit: inherit,

    // 子嗣危机 / 叛逃
    checkCrisis: checkCrisis,
    triggerCrisis: triggerCrisis,
    checkDefection: checkDefection,
    triggerDefection: triggerDefection,

    // 事件写入
    writeFamilyEvent: writeFamilyEvent,

    // 御案面板
    renderFamilyPanel: renderFamilyPanel,

    // UI 钩子
    _uiMarry: _uiMarry,
    _uiBirthChild: _uiBirthChild,
    _uiEducateChild: _uiEducateChild,

    // 内部函数暴露（smoke/调试·非游戏调用入口）
    _ensureState: _ensureState,
    _defaultState: _defaultState,
    _findChild: _findChild,
    _stageForAge: _stageForAge,
    _genChildName: _genChildName,
    _childEnemyLevel: _childEnemyLevel
  };

  // 双路径挂载：浏览器走 window.TM.PlayerFamily；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = ns;
    }
  } catch (_) {}
  try {
    if (global) {
      if (!global.TM) global.TM = {};
      global.TM.PlayerFamily = ns;
    }
  } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
