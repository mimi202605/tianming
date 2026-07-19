// ============================================================
// tm-player-keju.js — 穿越模式 Phase 4.5 · Task 24 玩家参加科举考试
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（内阁/票拟/
//   司礼监/东厂/西厂/锦衣卫/军机处/廷杖/八股/巡按/总督/巡抚/郡王/藩王
//   一律由剧本 hook）。
//   - 不写"翰林院修撰/编修/庶吉士"等明清翰林具体职务（沿用 tm-keju-allocation.js
//     朝代 dispatch·由该模块按朝代决定具体授官）
//   - 不写"乡试/会试/殿试"阶段名以外的明清科场专名（"乡试/会试/殿试"为跨朝代
//     通用考试层级·宋元明清均用·不属明清专名）
//   - 4 类考生出身（商贾/隐逸/宗室旁支/低级官吏子弟）通用·不挂任何朝代
//     特定的良贱身份制度
//   - 3 类弊案选择（行贿考官/请托关节/枪替冒名）由 tm-keju-scandal.js 兜底
//     已是跨朝代通名
// ------------------------------------------------------------
// 暴露：window.TM.PlayerKeju.{
//   STAGE, EXAM_STATUS, IDENTITY_OPEN_CLASSES, SCANDAL_CHOICES,
//   getCandidateState, applyForExam, answerQuestion, seekMaster,
//   passDianshiAndPromote, triggerScandal, renderPanel,
//   listExamHistory, listMasters, listScandals,
//   _getState, _ensureState, _callLLM, _isTransmigration
// }
// 依赖（运行时软依赖，缺席时降级）：
//   - TM.PlayerEconomy.getBalance / spend / addIncome     （玩家银钱账本）
//   - TM.PlayerInteraction.interact                       （NPC 关系/拜师）
//   - TM.Transmigration.isTransmigrationMode              （穿越模式判定）
//   - global.startKejuExam / advanceKejuByDays            （tm-keju-runtime.js 顶层函数）
//   - global._kjCalcTopicAlignment / _kjRenderExaminerHintBar （tm-keju-question-ui.js）
//   - global._kjSpawnScandal / _kjScandalKeyiCallback     （tm-keju-scandal.js）
//   - global._kjDispatchAllocationByDynasty / _kjApplyAllocations （tm-keju-allocation.js）
//   - global._kjpInitSchoolNetwork / _kjpGetActiveAcademies / _kjpSpawnShanzhang （tm-keju-school-network.js）
//   - GM._playerKeju / GM.turn / GM.chars / GM.year       （玩家考生账本）
//   - global.callAI / callLLM                             （LLM 适配·与 tm-sovereign-ai.js 一致）
//   - 剧本 hook：P.keju.currentExam / P.conf.useNewKejuScandal / P.dynasty / P.playerInfo.playerRole
// 双路径挂载：浏览器走 window.TM.PlayerKeju；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  var TM = global.TM = global.TM || {};

  // ════════════════════════════════════════════════════════════
  //  §1 常量
  // ════════════════════════════════════════════════════════════

  // 科举 4 阶段·跨朝代通名（童试/乡试/会试/殿试为宋元明清通用层级）
  //   详见 tasks.md SubTask 24.2：currentLevel{县试/府试/院试/乡试/会试/殿试}
  //   本表合并为 4 大阶段·县试/府试/院试归"童试"阶段
  var STAGE = {
    TONGSHI:  'tongshi',   // 童试（含县试/府试/院试·取秀才）
    XIANGSHI: 'xiangshi',  // 乡试（秋闱·取举人）
    HUISHI:   'huishi',    // 会试（春闱·取贡士）
    DIANSHI:  'dianshi'    // 殿试（天子亲策·取进士）
  };

  // 玩家考生状态机·朝代中立
  var EXAM_STATUS = {
    IDLE:       'idle',        // 未应试
    REGISTERED: 'registered',  // 已报名·待入场
    ANSWERING:  'answering',   // 作答中
    GRADED:     'graded',      // 已评卷·待放榜
    PASSED:     'passed',      // 已通过本级
    FAILED:     'failed',      // 未通过本级
    PROMOTED:   'promoted'     // 已授官（殿试通过后）
  };

  // 4 类开放身份·playerRole 在此集合内才能走科举路径
  //   详见 spec.md "玩家报名县试" Scenario：商贾/隐逸/宗室旁支/低级官吏子弟
  //   映射到 tm-transmigration.js ROLE 枚举
  var IDENTITY_OPEN_CLASSES = {
    merchant:           { label: '商贾',         desc: '市井商贾出身·走科举入仕' },
    commoner:           { label: '隐逸',         desc: '在野隐逸·白衣应举' },
    prince:             { label: '宗室旁支',     desc: '宗室旁支子弟·准应科举' },
    retired_official:   { label: '低级官吏子弟', desc: '低级官吏子弟·荫监未入流' },
    artisan:            { label: '匠户子弟',     desc: '匠户子弟·特许应举' }
  };

  // 3 类弊案选择·映射到 tm-keju-scandal.js SCANDAL_TYPES
  //   行贿考官 → bribery（请托关节）
  //   请托关节 → bribery（同上·走同一类型·但 detail 标式不同）
  //   枪替冒名 → impersonation（倩人代试）
  //   漏泄考题 → leak（剧本 hook 才出现·玩家不可主动选）
  //   阿私取士 → favoritism（主考行为·玩家被动卷入）
  var SCANDAL_CHOICES = {
    bribe:         { id: 'bribe',         label: '行贿考官', mapsTo: 'bribery',        risk: 'high',   reward: 'mid' },
    solicit:       { id: 'solicit',       label: '请托关节', mapsTo: 'bribery',        risk: 'mid',   reward: 'mid' },
    impersonate:   { id: 'impersonate',   label: '枪替冒名', mapsTo: 'impersonation',  risk: 'high',   reward: 'high' }
  };

  // 报名费（朝代中立·剧本可经 P.keju.feeOverrides 覆盖）
  var DEFAULT_FEES = {
    tongshi:  50,    // 童试·报名费低
    xiangshi: 200,   // 乡试·路费+卷资
    huishi:   500,   // 会试·赴京路费
    dianshi:  0      // 殿试·不收费
  };

  // 考题类型·跨朝代通名（经义/策论/诗赋）
  var QUESTION_TYPES = {
    classics: { id: 'classics', label: '经义', desc: '本经注疏·贴经墨义' },
    policy:   { id: 'policy',   label: '策论', desc: '时务策·问治国安邦' },
    poetry:   { id: 'poetry',   label: '诗赋', desc: '律赋·省题诗' }
  };

  // 拜师求学·师父类型加成（朝代中立）
  var MASTER_TYPES = {
    confucian:  { id: 'confucian',  label: '大儒',     bonus: { learning: 8, intelligence: 4 } },
    statecraft: { id: 'statecraft', label: '名臣',     bonus: { learning: 4, administration: 8 } },
    military:   { id: 'military',   label: '名将',     bonus: { military: 8, valor: 4 } },
    medical:    { id: 'medical',    label: '名医',     bonus: { learning: 4, special: '医术' } },
    literary:   { id: 'literary',   label: '文宗',     bonus: { learning: 6, diction: 6 } }
  };

  var KEJU_ID_PREFIX = 'pkeju_';
  var HISTORY_MAX = 100;
  var SCANDAL_HISTORY_MAX = 50;

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
    return KEJU_ID_PREFIX + Date.now().toString(36) + '_' + Math.floor(Math.random() * 1e6).toString(36);
  }
  function _curTurn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }
  function _curYear() {
    try {
      if (typeof GM !== 'undefined' && GM && _isNum(GM.year)) return GM.year;
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.time && _isNum(P.time.year)) return P.time.year;
    } catch (_) {}
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
    try { console.warn('[PlayerKeju]', m); } catch (_) {}
  }
  function _addEB(cat, txt) {
    if (typeof addEB === 'function') { try { addEB(cat, txt); return; } catch (_) {} }
    try { console.log('[PlayerKeju][' + cat + ']', txt); } catch (_) {}
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

  function _playerRole() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && _isStr(P.playerInfo.playerRole)) {
        return P.playerInfo.playerRole;
      }
    } catch (_) {}
    return '';
  }

  function _findChar(name) {
    try {
      if (typeof GM === 'undefined' || !GM || !Array.isArray(GM.chars)) return null;
      for (var i = 0; i < GM.chars.length; i++) {
        var c = GM.chars[i];
        if (c && c.name === name) return c;
      }
    } catch (_) {}
    return null;
  }

  // ── LLM 调用（与 tm-sovereign-ai.js / tm-player-trade.js 一致）──
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
    // 3) 降级·返回 null（由调用方规则引擎兜底）
    return null;
  }

  // ── 玩家银钱账本适配器（软依赖 TM.PlayerEconomy）──
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

  // ── 报名费查询·剧本 hook 优先 ──
  function _getFee(stage) {
    try {
      if (typeof P !== 'undefined' && P && P.keju && P.keju.feeOverrides && P.keju.feeOverrides[stage]) {
        return _isNum(P.keju.feeOverrides[stage]) ? P.keju.feeOverrides[stage] : DEFAULT_FEES[stage] || 0;
      }
    } catch (_) {}
    return DEFAULT_FEES[stage] || 0;
  }

  // ── 当前科举考试对象（软依赖 tm-keju-runtime.js）──
  function _getCurrentExam() {
    try {
      if (typeof P !== 'undefined' && P && P.keju) {
        return P.keju.currentExam || P.keju.currentEnke || null;
      }
    } catch (_) {}
    return null;
  }

  // ── tm-keju-runtime.js 顶层函数探测（startKejuExam / advanceKejuByDays）──
  function _startKejuExam(opts) {
    try { if (typeof global.startKejuExam === 'function') return global.startKejuExam(opts); } catch (_) {}
    return null;
  }
  function _advanceKejuByDays(days) {
    try { if (typeof global.advanceKejuByDays === 'function') return global.advanceKejuByDays(days); } catch (_) {}
    return null;
  }

  // ── tm-keju-question-ui.js 顶层函数探测（window._kj*）──
  function _kjCalcAlignment(topicText, view) {
    try {
      var fn = (typeof global._kjCalcTopicAlignment === 'function') ? global._kjCalcTopicAlignment
              : (typeof window !== 'undefined' && typeof window._kjCalcTopicAlignment === 'function') ? window._kjCalcTopicAlignment
              : null;
      if (fn) return fn(topicText, view);
    } catch (_) {}
    return 50; // 中性默认
  }
  function _kjRenderExaminerHintBar(examiner) {
    try {
      var fn = (typeof global._kjRenderExaminerHintBar === 'function') ? global._kjRenderExaminerHintBar
              : (typeof window !== 'undefined' && typeof window._kjRenderExaminerHintBar === 'function') ? window._kjRenderExaminerHintBar
              : null;
      if (fn) return fn(examiner);
    } catch (_) {}
    return '';
  }

  // ── tm-keju-scandal.js 顶层函数探测（window._kj*）──
  function _kjSpawnScandal(type, reason, detail) {
    try {
      var fn = (typeof global._kjSpawnScandal === 'function') ? global._kjSpawnScandal
              : (typeof window !== 'undefined' && typeof window._kjSpawnScandal === 'function') ? window._kjSpawnScandal
              : null;
      if (fn) return fn(type, reason, detail);
    } catch (_) {}
    return false;
  }

  // ── tm-keju-allocation.js 顶层函数探测（window._kj*）──
  function _kjDispatchAllocation(grads, dynasty) {
    try {
      var fn = (typeof global._kjDispatchAllocationByDynasty === 'function') ? global._kjDispatchAllocationByDynasty
              : (typeof window !== 'undefined' && typeof window._kjDispatchAllocationByDynasty === 'function') ? window._kjDispatchAllocationByDynasty
              : null;
      if (fn) return fn(grads, dynasty);
    } catch (_) {}
    return [];
  }
  function _kjApplyAllocations(allocations, exam) {
    try {
      var fn = (typeof global._kjApplyAllocations === 'function') ? global._kjApplyAllocations
              : (typeof window !== 'undefined' && typeof window._kjApplyAllocations === 'function') ? window._kjApplyAllocations
              : null;
      if (fn) return fn(allocations, exam);
    } catch (_) {}
    return 0;
  }

  // ── tm-keju-school-network.js 顶层函数探测（window._kjp*）──
  function _kjpInitSchoolNetwork() {
    try {
      var fn = (typeof global._kjpInitSchoolNetwork === 'function') ? global._kjpInitSchoolNetwork
              : (typeof window !== 'undefined' && typeof window._kjpInitSchoolNetwork === 'function') ? window._kjpInitSchoolNetwork
              : null;
      if (fn) return fn();
    } catch (_) {}
    return null;
  }
  function _kjpGetActiveAcademies() {
    try {
      var fn = (typeof global._kjpGetActiveAcademies === 'function') ? global._kjpGetActiveAcademies
              : (typeof window !== 'undefined' && typeof window._kjpGetActiveAcademies === 'function') ? window._kjpGetActiveAcademies
              : null;
      if (fn) return fn();
    } catch (_) {}
    return [];
  }
  function _kjpSpawnShanzhang(academyConfig) {
    try {
      var fn = (typeof global._kjpSpawnShanzhang === 'function') ? global._kjpSpawnShanzhang
              : (typeof window !== 'undefined' && typeof window._kjpSpawnShanzhang === 'function') ? window._kjpSpawnShanzhang
              : null;
      if (fn) return fn(academyConfig);
    } catch (_) {}
    return null;
  }

  // ════════════════════════════════════════════════════════════
  //  §3 状态读写（玩家考生账本挂在 GM._playerKeju）
  // ════════════════════════════════════════════════════════════

  function _defaultState() {
    return {
      stage: null,            // 当前应试阶段·null=未应试·见 STAGE
      status: EXAM_STATUS.IDLE,
      currentLevel: '',       // 当前层级名（县试/府试/院试/乡试/会试/殿试）
      currentExamId: '',      // 关联的 P.keju.currentExam.id
      candidateId: '',        // 玩家作为考生的注册 id
      score: 0,               // 当前阶段得分
      rank: 0,                // 名次（殿试后定）
      tier: '',               // 进士层级（zhuangyuan/bangyan/tanhua/erjia/sanjia）
      masterName: '',         // 已拜师父名
      masterType: '',         // 师父类型
      schools: [],            // 已入学书院列表
      history: [],            // 应试历史
      scandals: [],           // 卷入弊案历史
      graduated: false,       // 是否已通过殿试
      officialTitle: '',      // 殿试后授予的官职
      dept: ''                // 授官部门
    };
  }

  function _getState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerKeju) {
        GM._playerKeju = _defaultState(); // arch-ok (玩家考生账本初始化)
      }
      return GM._playerKeju;
    } catch (_) { return null; }
  }

  function _ensureState() { return _getState(); }

  function _resetCandidate() {
    var s = _getState();
    if (!s) return null;
    s.stage = null;                                    // arch-ok (重置应试阶段)
    s.status = EXAM_STATUS.IDLE;                       // arch-ok (重置状态)
    s.currentLevel = '';                               // arch-ok
    s.currentExamId = '';                              // arch-ok
    s.candidateId = '';                                // arch-ok
    s.score = 0;                                       // arch-ok
    s.rank = 0;                                        // arch-ok
    s.tier = '';                                       // arch-ok
    return s;
  }

  function _pushHistory(entry) {
    var s = _getState();
    if (!s || !entry) return;
    s.history.push(entry);                             // arch-ok (写入应试历史)
    if (s.history.length > HISTORY_MAX) {
      s.history = s.history.slice(-HISTORY_MAX);       // arch-ok (截断历史)
    }
  }

  function _pushScandal(entry) {
    var s = _getState();
    if (!s || !entry) return;
    s.scandals.push(entry);                            // arch-ok (写入弊案历史)
    if (s.scandals.length > SCANDAL_HISTORY_MAX) {
      s.scandals = s.scandals.slice(-SCANDAL_HISTORY_MAX); // arch-ok
    }
  }

  // ════════════════════════════════════════════════════════════
  //  §4 报名应试（SubTask 24.3）
  // ════════════════════════════════════════════════════════════

  function applyForExam(opts) {
    opts = opts || {};

    // 守卫 1：非穿越模式拒绝
    if (!_isTransmigration()) {
      return { ok: false, code: 'not-transmigration', reason: '非穿越模式不可应科举' };
    }

    // 守卫 2：身份不在开放集合内
    var role = _playerRole();
    if (!IDENTITY_OPEN_CLASSES[role]) {
      return {
        ok: false, code: 'identity-not-eligible',
        reason: '当前身份「' + (role || '未知') + '」不可走科举路径·开放身份：商贾/隐逸/宗室旁支/低级官吏子弟'
      };
    }

    // 守卫 3：已有科举进行中
    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };
    if (s.status !== EXAM_STATUS.IDLE && s.status !== EXAM_STATUS.PASSED && s.status !== EXAM_STATUS.FAILED && s.status !== EXAM_STATUS.PROMOTED) {
      return { ok: false, code: 'exam-in-progress', reason: '已有科举进行中·不可重复报名' };
    }

    // 守卫 4：未通过殿试的玩家不可越级报殿试（opts.force 跳过·剧本 hook 直殿试用）
    var stage = opts.stage || STAGE.TONGSHI;
    if (!opts.force && stage === STAGE.DIANSHI && !s.graduated && s.status !== EXAM_STATUS.PASSED) {
      // 注：玩家可经剧本 hook 直接殿试·此处只在 stage 未通过会试时拒绝
      if (s.tier !== 'gongshi' && s.currentLevel !== '会试') {
        return { ok: false, code: 'stage-violation', reason: '未通过会试·不可越级报殿试' };
      }
    }

    // 守卫 5：报名费
    var fee = _getFee(stage);
    if (fee > 0) {
      var cashRes = _spendPlayerCash(fee, '科举报名·' + stage);
      if (!cashRes.ok) {
        return { ok: false, code: 'insufficient-funds', reason: cashRes.reason || '银钱不足·不可报名', fee: fee };
      }
    }

    // 写状态
    var prevStatus = s.status;
    s.stage = stage;                                   // arch-ok (设置应试阶段)
    s.status = EXAM_STATUS.REGISTERED;                 // arch-ok
    s.currentLevel = _stageToLevel(stage);             // arch-ok
    s.score = 0;                                       // arch-ok
    s.rank = 0;                                        // arch-ok

    // 接入 tm-keju-runtime.js（软依赖）·启动一场科举·玩家以考生身份参与
    var examId = '';
    var exam = _getCurrentExam();
    if (!exam) {
      // 没有进行中的科举·尝试启动一场（剧本未禁时）
      try {
        _startKejuExam({ launchMethod: opts.launchMethod || 'council' });
        exam = _getCurrentExam();
      } catch (_) {}
    }
    if (exam) {
      examId = exam.id || '';
      s.currentExamId = examId;                        // arch-ok
      // 注册玩家为考生·push 到 gradPool
      try {
        var candidateEntry = {
          name: _playerName(),
          age: 0, origin: '', class: IDENTITY_OPEN_CLASSES[role].label,
          party: '', score: 0, rank: 0,
          _player: true,
          _registeredAt: _curTurn()
        };
        if (!Array.isArray(exam.gradPool)) exam.gradPool = []; // arch-ok (字段补全)
        exam.gradPool.push(candidateEntry);            // arch-ok (注册玩家为考生)
        s.candidateId = candidateEntry.name;           // arch-ok
      } catch (_) {}
    }

    // LLM 生成报名场景（缺席降级）
    var scene = _generateApplyScene(stage, role);

    _addEB('科举', '玩家应科举·' + IDENTITY_OPEN_CLASSES[role].label + '·阶段 ' + stage);

    return {
      ok: true,
      stage: stage,
      level: s.currentLevel,
      fee: fee,
      examId: examId,
      candidateId: s.candidateId,
      scene: scene,
      prevStatus: prevStatus
    };
  }

  function _stageToLevel(stage) {
    var map = {
      tongshi: '童试',
      xiangshi: '乡试',
      huishi: '会试',
      dianshi: '殿试'
    };
    return map[stage] || stage;
  }

  function _generateApplyScene(stage, role) {
    var pName = _playerName();
    var idLabel = (IDENTITY_OPEN_CLASSES[role] && IDENTITY_OPEN_CLASSES[role].label) || role;
    var stageLabel = _stageToLevel(stage);

    var prompt = [
      '【玩家应科举·报名场景】',
      '玩家：' + pName + '（' + idLabel + ' 出身）',
      '应试阶段：' + stageLabel,
      '请生成一段 60-120 字的报名场景描述（朝代中立·不挂任何朝代专属建制名·半文言风格）。'
    ].join('\n');

    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string' && llm.trim()) return llm.trim();

    // 降级·确定性 mock
    return pName + '以' + idLabel + '身份·投牒应' + stageLabel + '·备卷资·赴考。';
  }

  // ════════════════════════════════════════════════════════════
  //  §5 作答考题（SubTask 24.5）
  // ════════════════════════════════════════════════════════════

  function answerQuestion(opts) {
    opts = opts || {};

    if (!_isTransmigration()) return { ok: false, code: 'not-transmigration', reason: '非穿越模式' };

    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };

    // 守卫：状态须为 registered 或 answering
    if (s.status !== EXAM_STATUS.REGISTERED && s.status !== EXAM_STATUS.ANSWERING) {
      return { ok: false, code: 'wrong-status', reason: '当前状态「' + s.status + '」不可作答·须先报名' };
    }

    var exam = _getCurrentExam();
    if (!exam) {
      return { ok: false, code: 'no-exam', reason: '当前无科举进行中' };
    }

    // 题目类型·优先剧本 hook·其次玩家传入·默认 classics
    var qType = opts.type || (exam.playerQuestion && 'policy') || 'classics';
    var qTypeDef = QUESTION_TYPES[qType] || QUESTION_TYPES.classics;

    // 题面·优先剧本 hook（exam.huishiTopic / exam.playerQuestion）·其次玩家传入
    var topicText = opts.topic || exam.huishiTopic || exam.playerQuestion || _defaultTopic(qType);

    // 玩家答卷·必填
    var answerText = opts.answer || '';
    if (!_isStr(answerText)) {
      return { ok: false, code: 'empty-answer', reason: '答卷为空·不可提交' };
    }

    // 状态→作答中
    s.status = EXAM_STATUS.ANSWERING;                  // arch-ok

    // 复用 tm-keju-question-ui.js 的题目契合度计算
    var examinerView = null;
    try {
      if (exam.chiefExaminer) {
        var examiner = null;
        if (typeof findCharByName === 'function') {
          examiner = findCharByName(exam.chiefExaminer);
        }
        if (examiner && typeof _kejuExaminerView === 'function') {
          examinerView = _kejuExaminerView(examiner);
        }
      }
    } catch (_) {}
    var alignment = _kjCalcAlignment(topicText, examinerView);

    // LLM 评卷
    var grade = _llmGradeAnswer(topicText, answerText, qType, alignment);
    var score = grade.score;
    var comment = grade.comment;

    // 写状态
    s.status = EXAM_STATUS.GRADED;                     // arch-ok
    s.score = score;                                   // arch-ok

    // 写入应试历史
    _pushHistory({
      turn: _curTurn(),
      year: _curYear(),
      stage: s.stage,
      level: s.currentLevel,
      examId: s.currentExamId,
      type: qType,
      topic: topicText,
      answer: answerText,
      score: score,
      alignment: alignment,
      comment: comment,
      passed: score >= 60
    });

    // 同步玩家成绩到 gradPool
    try {
      if (Array.isArray(exam.gradPool)) {
        for (var i = 0; i < exam.gradPool.length; i++) {
          var g = exam.gradPool[i];
          if (g && g._player) {
            g.score = score;                            // arch-ok (同步玩家成绩到 gradPool)
            if (score >= 60) g.passed = true;           // arch-ok
          }
        }
      }
    } catch (_) {}

    _addEB('科举', '玩家作答·' + qTypeDef.label + '·得分 ' + score + '·契合度 ' + alignment);

    return {
      ok: true,
      type: qType,
      typeLabel: qTypeDef.label,
      topic: topicText,
      score: score,
      alignment: alignment,
      comment: comment,
      passed: score >= 60,
      examinerHint: examinerView ? _kjRenderExaminerHintBar({ name: exam.chiefExaminer }) : ''
    };
  }

  function _defaultTopic(qType) {
    var map = {
      classics: '请述《论语·学而》"学而时习之"之要义',
      policy:   '问：今欲兴农·当以何策为先？',
      poetry:   '赋得"春风又绿江南岸"·七律一首'
    };
    return map[qType] || map.classics;
  }

  function _llmGradeAnswer(topic, answer, qType, alignment) {
    var pName = _playerName();
    var prompt = [
      '【科举评卷·玩家答卷】',
      '考生：' + pName,
      '题类：' + (QUESTION_TYPES[qType] && QUESTION_TYPES[qType].label || qType),
      '题面：' + topic,
      '答卷：' + answer,
      '题目契合主考偏好度：' + alignment + '/100',
      '',
      '请按 0-100 分评卷·并给 30-60 字评语。',
      '返回格式严格：',
      'SCORE: <0-100 整数>',
      'COMMENT: <评语·半文言>',
      '要求：朝代中立·不挂任何朝代专属建制名。'
    ].join('\n');

    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string') {
      var scoreMatch = llm.match(/SCORE:\s*(\d+)/i);
      var commentMatch = llm.match(/COMMENT:\s*([^\n]+)/i);
      if (scoreMatch) {
        var sc = _clamp(parseInt(scoreMatch[1], 10) || 0, 0, 100);
        var cm = commentMatch ? commentMatch[1].trim() : '';
        return { score: sc, comment: cm, source: 'llm' };
      }
    }

    // 降级·确定性规则引擎评分（基于答卷长度 + 契合度 + 题类基础分）
    var baseByType = { classics: 50, policy: 55, poetry: 45 };
    var base = baseByType[qType] || 50;
    var lenBonus = Math.min(20, Math.floor(answer.length / 30)); // 30 字 +1 分·最高 +20
    var alignBonus = Math.floor((alignment - 50) * 0.3); // 契合度 ±15
    var deterministic = _deterministicHash(pName + topic + answer);
    var luck = deterministic % 11 - 5; // -5..+5
    var finalScore = _clamp(base + lenBonus + alignBonus + luck, 0, 100);

    var comment = '答卷字数 ' + answer.length + '·契合度 ' + alignment + '·基分 ' + base +
                  '·评：' + (finalScore >= 80 ? '文理通达·可造之材' :
                             finalScore >= 60 ? '中规中矩·堪堪入选' :
                             '辞不达意·尚须力学');
    return { score: finalScore, comment: comment, source: 'fallback' };
  }

  function _deterministicHash(s) {
    s = String(s || '');
    var h = 0;
    for (var i = 0; i < s.length; i++) h = ((h * 31) + s.charCodeAt(i)) & 0x0fffffff;
    return h;
  }

  // ════════════════════════════════════════════════════════════
  //  §6 拜师求学（SubTask 24.6）
  // ════════════════════════════════════════════════════════════

  function seekMaster(npcName, opts) {
    opts = opts || {};

    if (!_isTransmigration()) return { ok: false, code: 'not-transmigration', reason: '非穿越模式' };
    if (!_isStr(npcName)) return { ok: false, code: 'no-npc', reason: '未指定师父 NPC' };

    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };

    // 守卫：已拜师·不可重复（除非剧本允许 replace）
    if (s.masterName && !opts.replace) {
      return { ok: false, code: 'already-has-master', reason: '已拜师父「' + s.masterName + '」·不可重复拜师', currentMaster: s.masterName };
    }

    // NPC 必须存在且 alive
    var npcCh = _findChar(npcName);
    if (!npcCh) return { ok: false, code: 'npc-not-found', reason: '未找到 NPC：' + npcName };
    if (npcCh.alive === false) return { ok: false, code: 'npc-dead', reason: 'NPC 已不在人世：' + npcName };

    // 推导师父类型·优先剧本 hook（NPC.masterType）·其次 opts.type·最后按 NPC.officialTitle/role 启发式
    var masterType = npcCh.masterType || opts.type || _inferMasterType(npcCh);
    var typeDef = MASTER_TYPES[masterType] || MASTER_TYPES.confucian;

    // 调用 TM.PlayerInteraction.interact(npcName, 'disciple', payload)
    var interactionRes = null;
    try {
      if (TM && TM.PlayerInteraction && typeof TM.PlayerInteraction.interact === 'function') {
        interactionRes = TM.PlayerInteraction.interact(npcName, 'disciple', {
          masterType: masterType,
          tuition: opts.tuition || 0,
          note: opts.note || ''
        });
      }
    } catch (_) {}

    // 学费·优先走 PlayerEconomy
    var tuition = _isNum(opts.tuition) ? opts.tuition : 100;
    var cashRes = _spendPlayerCash(tuition, '拜师束脩·' + npcName);
    if (!cashRes.ok && tuition > 0) {
      return { ok: false, code: 'insufficient-funds', reason: cashRes.reason || '银钱不足·束脩不可少', tuition: tuition };
    }

    // 写状态
    var prevMaster = s.masterName;
    s.masterName = npcName;                            // arch-ok (记录已拜师父)
    s.masterType = masterType;                         // arch-ok
    try {
      s.schools.push({ name: npcName + '门下', masterName: npcName, masterType: masterType, joinedTurn: _curTurn(), joinedYear: _curYear() }); // arch-ok
    } catch (_) {}

    // 应用师父加成到玩家 char
    try {
      var playerCh = _findChar(_playerName());
      if (playerCh) {
        if (!playerCh.learning) playerCh.learning = 0; // arch-ok (字段补全)
        playerCh.learning = _clamp((playerCh.learning || 0) + (typeDef.bonus.learning || 0), 0, 100); // arch-ok (师父加成)
        if (typeDef.bonus.intelligence) {
          if (typeof playerCh.intelligence !== 'number') playerCh.intelligence = 0; // arch-ok
          playerCh.intelligence = _clamp((playerCh.intelligence || 0) + typeDef.bonus.intelligence, 0, 100); // arch-ok
        }
        if (typeDef.bonus.administration) {
          if (typeof playerCh.administration !== 'number') playerCh.administration = 0; // arch-ok
          playerCh.administration = _clamp((playerCh.administration || 0) + typeDef.bonus.administration, 0, 100); // arch-ok
        }
        if (typeDef.bonus.military) {
          if (typeof playerCh.military !== 'number') playerCh.military = 0; // arch-ok
          playerCh.military = _clamp((playerCh.military || 0) + typeDef.bonus.military, 0, 100); // arch-ok
        }
        if (typeDef.bonus.valor) {
          if (typeof playerCh.valor !== 'number') playerCh.valor = 0; // arch-ok
          playerCh.valor = _clamp((playerCh.valor || 0) + typeDef.bonus.valor, 0, 100); // arch-ok
        }
        if (typeDef.bonus.diction) {
          if (typeof playerCh.diction !== 'number') playerCh.diction = 0; // arch-ok
          playerCh.diction = _clamp((playerCh.diction || 0) + typeDef.bonus.diction, 0, 100); // arch-ok
        }
        playerCh._master = npcName;                    // arch-ok (标师父关系)
      }
    } catch (_) {}

    // LLM 生成拜师场景
    var scene = _generateMasterScene(npcName, masterType);

    _addEB('科举', '玩家拜师·' + npcName + '·' + typeDef.label);

    return {
      ok: true,
      masterName: npcName,
      masterType: masterType,
      masterTypeLabel: typeDef.label,
      bonus: typeDef.bonus,
      tuition: tuition,
      cash: cashRes.cash,
      prevMaster: prevMaster,
      interaction: interactionRes,
      scene: scene
    };
  }

  function _inferMasterType(ch) {
    var title = String(ch.officialTitle || ch.role || '');
    if (/将|帅|武/.test(title)) return 'military';
    if (/医|药/.test(title)) return 'medical';
    if (/相|尚|令|丞/.test(title)) return 'statecraft';
    if (/文|翰|学|儒|诗/.test(title)) return 'literary';
    return 'confucian';
  }

  function _generateMasterScene(npcName, masterType) {
    var pName = _playerName();
    var typeLabel = (MASTER_TYPES[masterType] && MASTER_TYPES[masterType].label) || masterType;
    var prompt = [
      '【玩家拜师·场景生成】',
      '玩家：' + pName,
      '师父：' + npcName + '（' + typeLabel + '）',
      '请生成一段 60-120 字的拜师场景描述（朝代中立·不挂任何朝代专属建制名·半文言风格）。'
    ].join('\n');

    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string' && llm.trim()) return llm.trim();

    return pName + '持束脩·拜' + npcName + '为师·' + typeLabel + '之门下·受业解惑。';
  }

  // ════════════════════════════════════════════════════════════
  //  §7 考中进士·身份变更（SubTask 24.7）
  // ════════════════════════════════════════════════════════════

  function passDianshiAndPromote(opts) {
    opts = opts || {};

    if (!_isTransmigration()) return { ok: false, code: 'not-transmigration', reason: '非穿越模式' };

    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };

    // 守卫：未在殿试阶段或未评卷
    if (s.stage !== STAGE.DIANSHI && !opts.force) {
      return { ok: false, code: 'wrong-stage', reason: '当前非殿试阶段·不可触发进士身份变更', stage: s.stage };
    }
    if (s.status !== EXAM_STATUS.GRADED && !opts.force) {
      return { ok: false, code: 'wrong-status', reason: '当前状态「' + s.status + '」不可触发身份变更', status: s.status };
    }

    // 守卫：分数不达标（殿试须 ≥ 60 才算进士）
    var score = opts.score != null ? opts.score : s.score;
    if (score < 60 && !opts.force) {
      return { ok: false, code: 'score-too-low', reason: '殿试得分 ' + score + ' 不达标·须 ≥ 60 才算进士', score: score };
    }

    // 推导名次/层级（剧本 opts.rank 优先·否则按 score 推）
    var rank = _isNum(opts.rank) ? opts.rank : _rankFromScore(score);
    var tier = _tierFromRank(rank);

    // 1) 写入玩家考生账本
    s.status = EXAM_STATUS.PROMOTED;                   // arch-ok
    s.rank = rank;                                     // arch-ok
    s.tier = tier;                                     // arch-ok
    s.graduated = true;                                // arch-ok

    // 2) 玩家身份变更：进士 + playerRole 升级为 minister
    var pName = _playerName();
    var playerCh = _findChar(pName);
    var prevRole = _playerRole();
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        P.playerInfo.playerRole = 'minister';          // arch-ok (考中进士·升级为 minister)
        if (!P.playerInfo.officialTitle) {
          P.playerInfo.officialTitle = '进士';         // arch-ok
        }
      }
    } catch (_) {}
    if (playerCh) {
      try {
        playerCh.officialTitle = '进士';               // arch-ok (玩家身份变更为进士)
        if (typeof playerCh.playerRole === 'string') {
          playerCh.playerRole = 'minister';            // arch-ok
        }
        playerCh._jinshi = true;                       // arch-ok (进士标记)
        playerCh._jinshiYear = _curYear();             // arch-ok
        playerCh._jinshiRank = rank;                   // arch-ok
        if (!playerCh.resources) playerCh.resources = {}; // arch-ok (字段补全)
      } catch (_) {}
    }

    // 3) 自动授予官职·沿用 tm-keju-allocation.js 朝代 dispatch
    var dynasty = '';
    try {
      if (typeof P !== 'undefined' && P) dynasty = P.dynasty || P.era || '';
    } catch (_) {}

    var grads = [{
      name: pName,
      rank: rank,
      score: score,
      _player: true
    }];
    // 把玩家加入 exam.dianshiResults·让 _kjApplyAllocations 能找到
    var exam = _getCurrentExam();
    if (exam) {
      try {
        if (!Array.isArray(exam.dianshiResults)) exam.dianshiResults = []; // arch-ok (字段补全)
        // 防重
        var exists = false;
        for (var i = 0; i < exam.dianshiResults.length; i++) {
          if (exam.dianshiResults[i] && exam.dianshiResults[i].name === pName) { exists = true; break; }
        }
        if (!exists) exam.dianshiResults.push(grads[0]); // arch-ok (写入殿试成绩)
      } catch (_) {}
    }

    var allocations = _kjDispatchAllocation(grads, dynasty);
    // 注：_kjApplyAllocations 会写 ch.officialTitle = alloc.officialTitle（如"知制诰"）
    // 玩家身份应保留"进士"（永久功名）·授官结果存 s.officialTitle / r.officialTitle
    // 故先保存玩家 officialTitle·调 _kjApplyAllocations 后恢复
    var _savedPlayerTitle = playerCh ? playerCh.officialTitle : null;
    var _savedPlayerDept  = playerCh ? playerCh.dept : null;
    var applied = _kjApplyAllocations(allocations, exam);
    if (playerCh) {
      try {
        playerCh.officialTitle = _savedPlayerTitle;      // arch-ok (恢复进士功名·授官存 s.officialTitle)
        if (_savedPlayerDept !== undefined) playerCh.dept = _savedPlayerDept;
      } catch (_) {}
    }

    // 读回分配结果到玩家账本
    var officialTitle = '';
    var dept = '';
    if (allocations && allocations.length > 0) {
      officialTitle = allocations[0].officialTitle || '';
      dept = allocations[0].dept || '';
      s.officialTitle = officialTitle;                 // arch-ok
      s.dept = dept;                                   // arch-ok
    }

    // 写应试历史
    _pushHistory({
      turn: _curTurn(),
      year: _curYear(),
      stage: STAGE.DIANSHI,
      level: '殿试',
      examId: s.currentExamId,
      type: 'dianshi',
      topic: '',
      answer: '',
      score: score,
      rank: rank,
      tier: tier,
      comment: '殿试通过·身份变更为进士',
      passed: true,
      promoted: true,
      officialTitle: officialTitle,
      dept: dept,
      prevRole: prevRole
    });

    // 重置当前应试状态（graduate 后保留 graduated 标记）
    s.stage = null;                                    // arch-ok
    s.currentLevel = '';                               // arch-ok
    s.currentExamId = '';                              // arch-ok
    s.candidateId = '';                                // arch-ok

    // LLM 生成进士及第场景
    var scene = _generatePromoteScene(pName, score, rank, tier, officialTitle, dept);

    _addEB('科举', '玩家考中进士·第 ' + rank + ' 名·授 ' + officialTitle + '·playerRole → minister');

    return {
      ok: true,
      score: score,
      rank: rank,
      tier: tier,
      tierLabel: _tierLabel(tier),
      officialTitle: officialTitle,
      dept: dept,
      prevRole: prevRole,
      newRole: 'minister',
      applied: applied,
      allocations: allocations,
      scene: scene
    };
  }

  function _rankFromScore(score) {
    // 90+ → 前 3 名（一甲）·80-89 → 4-20 名（二甲）·60-79 → 21+ 名（三甲）
    if (score >= 95) return 1;
    if (score >= 90) return 2 + Math.floor((100 - score) / 3);
    if (score >= 80) return 4 + Math.floor((95 - score) / 2);
    return 21 + Math.floor((80 - score) / 2);
  }
  function _tierFromRank(rank) {
    if (rank === 1) return 'zhuangyuan';
    if (rank === 2) return 'bangyan';
    if (rank === 3) return 'tanhua';
    if (rank <= 20) return 'erjia';
    return 'sanjia';
  }
  function _tierLabel(tier) {
    var m = {
      zhuangyuan: '状元',
      bangyan: '榜眼',
      tanhua: '探花',
      erjia: '二甲进士',
      sanjia: '三甲进士'
    };
    return m[tier] || tier;
  }

  function _generatePromoteScene(pName, score, rank, tier, title, dept) {
    var tierLabel = _tierLabel(tier);
    var prompt = [
      '【玩家考中进士·场景生成】',
      '玩家：' + pName,
      '殿试得分：' + score,
      '名次：第 ' + rank + ' 名（' + tierLabel + '）',
      '授官：' + (title || '未授') + (dept ? '·部门 ' + dept : ''),
      '请生成一段 80-150 字的进士及第场景描述（朝代中立·不挂任何朝代专属建制名·半文言风格·含金榜题名+授官仪典）。'
    ].join('\n');

    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string' && llm.trim()) return llm.trim();

    return pName + '殿试及第·第 ' + rank + ' 名（' + tierLabel + '）·金榜题名·授' + (title || '官职') + '。';
  }

  // ════════════════════════════════════════════════════════════
  //  §8 卷入科场弊案（SubTask 24.8）
  // ════════════════════════════════════════════════════════════

  function triggerScandal(choice, opts) {
    opts = opts || {};

    if (!_isTransmigration()) return { ok: false, code: 'not-transmigration', reason: '非穿越模式' };

    // 守卫：choice 必须在 SCANDAL_CHOICES 内
    var choiceDef = SCANDAL_CHOICES[choice];
    if (!choiceDef) {
      return {
        ok: false, code: 'invalid-choice',
        reason: '未知弊案选择·可选：' + Object.keys(SCANDAL_CHOICES).join(' / '),
        choices: Object.keys(SCANDAL_CHOICES)
      };
    }

    var s = _ensureState();
    if (!s) return { ok: false, reason: '账本未就绪' };

    // 守卫：未在科举进行中
    var exam = _getCurrentExam();
    if (!exam) {
      return { ok: false, code: 'no-exam', reason: '当前无科举进行中·弊案无依附' };
    }

    // 守卫：tm-keju-scandal.js flag 关闭时降级·不调 _kjSpawnScandal
    var scandalEnabled = false;
    try {
      if (typeof P !== 'undefined' && P && P.conf) scandalEnabled = P.conf.useNewKejuScandal === true;
    } catch (_) {}

    var scandalType = choiceDef.mapsTo; // bribery / impersonation
    var reason = _buildScandalReason(choiceDef, opts);
    var detail = {
      examinerName: exam.chiefExaminer || '',
      severity: _choiceSeverity(choiceDef),
      bias: 0.5,
      corruption: _scGetCorruption(),
      tension: _scGetTension(),
      playerChoice: choice,
      playerName: _playerName()
    };

    var spawned = false;
    if (scandalEnabled) {
      spawned = _kjSpawnScandal(scandalType, reason, detail);
    }

    // 写入玩家弊案历史（无论 flag 是否开·都记玩家行为）
    var entry = {
      turn: _curTurn(),
      year: _curYear(),
      choice: choice,
      choiceLabel: choiceDef.label,
      mapsTo: scandalType,
      reason: reason,
      risk: choiceDef.risk,
      reward: choiceDef.reward,
      spawned: spawned,
      flagOn: scandalEnabled,
      detail: detail
    };
    _pushScandal(entry);

    // 应用风险/收益·玩家属性微调
    var riskRes = _applyScandalRisk(choiceDef, opts);

    // LLM 生成弊案场景
    var scene = _generateScandalScene(choiceDef, reason, spawned);

    _addEB('科举', '玩家卷入弊案·' + choiceDef.label + '·风险 ' + choiceDef.risk + '·收益 ' + choiceDef.reward);

    return {
      ok: true,
      choice: choice,
      choiceLabel: choiceDef.label,
      mapsTo: scandalType,
      spawned: spawned,
      flagOn: scandalEnabled,
      reason: reason,
      risk: riskRes,
      scene: scene
    };
  }

  function _scGetCorruption() {
    try {
      if (typeof GM !== 'undefined' && GM && typeof GM.corruption === 'number') return GM.corruption;
      if (GM && GM.keju && typeof GM.keju.corruption === 'number') return GM.keju.corruption;
    } catch (_) {}
    return 0;
  }
  function _scGetTension() {
    try {
      if (typeof GM !== 'undefined' && GM && GM.keju && typeof GM.keju.tension === 'number') return GM.keju.tension;
    } catch (_) {}
    return 0;
  }
  function _choiceSeverity(choiceDef) {
    if (choiceDef.risk === 'high') return 0.7;
    if (choiceDef.risk === 'mid') return 0.5;
    return 0.3;
  }

  function _buildScandalReason(choiceDef, opts) {
    var pName = _playerName();
    var map = {
      bribe: pName + '赂买主考·暗通关节·希图幸进',
      solicit: pName + '请托权要·关节主考·图谋功名',
      impersonate: pName + '倩人枪替·冒籍代试·欺瞒科场'
    };
    return map[choiceDef.id] || (pName + '科场舞弊·' + choiceDef.label);
  }

  function _applyScandalRisk(choiceDef, opts) {
    // 风险：玩家属性微调（败露概率 = f(choiceDef.risk + 现有 corruption)）
    var corruption = _scGetCorruption();
    var detectedProb = (choiceDef.risk === 'high' ? 0.35 : choiceDef.risk === 'mid' ? 0.20 : 0.10) + corruption / 200;
    var detected = (opts.forceDetected === true) || (Math.random() < detectedProb);

    try {
      if (typeof GM !== 'undefined' && GM) {
        // 卷入弊案·吏治腐败+1~3
        var corrDelta = choiceDef.risk === 'high' ? 3 : choiceDef.risk === 'mid' ? 2 : 1;
        if (typeof GM.corruption === 'number') {
          GM.corruption = _clamp((GM.corruption || 0) + corrDelta, 0, 100); // arch-ok (弊案增加腐败)
        }
      }
    } catch (_) {}

    // 玩家短期收益·分数微加
    var s = _getState();
    if (s && choiceDef.reward !== 'none') {
      var scoreBonus = choiceDef.reward === 'high' ? 15 : choiceDef.reward === 'mid' ? 10 : 5;
      s.score = _clamp((s.score || 0) + scoreBonus, 0, 100); // arch-ok (弊案收益·分数微加)
    }

    return {
      detected: detected,
      detectedProb: detectedProb,
      corruptionDelta: choiceDef.risk === 'high' ? 3 : choiceDef.risk === 'mid' ? 2 : 1,
      scoreBonus: choiceDef.reward === 'high' ? 15 : choiceDef.reward === 'mid' ? 10 : 5
    };
  }

  function _generateScandalScene(choiceDef, reason, spawned) {
    var pName = _playerName();
    var prompt = [
      '【玩家卷入科场弊案·场景生成】',
      '玩家：' + pName,
      '弊案选择：' + choiceDef.label,
      '事由：' + reason,
      '是否已触发弊案引擎：' + (spawned ? '是' : '否（flag 关闭·仅记账）'),
      '请生成一段 60-120 字的弊案场景描述（朝代中立·不挂任何朝代专属建制名·半文言风格·含暗箱操作+败露风险）。'
    ].join('\n');

    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string' && llm.trim()) return llm.trim();

    return pName + choiceDef.label + '·' + reason + '。' + (spawned ? '风声渐起·有司已有所闻。' : '暗箱之事·暂未彰闻。');
  }

  // ════════════════════════════════════════════════════════════
  //  §9 御案"科举"面板（SubTask 24.9）
  // ════════════════════════════════════════════════════════════

  function renderPanel(targetEl) {
    if (!_isTransmigration()) {
      var emptyHtml = '<div class="pk-panel"><div class="pk-empty">非穿越模式·无可应科举</div></div>';
      if (targetEl && typeof targetEl === 'object') {
        try { targetEl.innerHTML = emptyHtml; return null; } catch (_) {}
      }
      return emptyHtml;
    }

    var s = _getState();
    var pName = _playerName();
    var role = _playerRole();
    var idDef = IDENTITY_OPEN_CLASSES[role];
    var cash = _getPlayerCash();
    var exam = _getCurrentExam();

    var h = '<div class="pk-panel">';

    // 头部
    h += '<div class="pk-panel-head">';
    h += '<div class="pk-panel-title">📜 科 举 应 试</div>';
    h += '<div class="pk-cash">银钱 ' + cash + ' 两</div>';
    h += '</div>';

    // 玩家身份
    h += '<div class="pk-section"><div class="pk-section-title">考 生 身 份</div>';
    h += '<div class="pk-row"><span>姓名</span><span class="pk-val">' + _esc(pName) + '</span></div>';
    h += '<div class="pk-row"><span>出身</span><span class="pk-val">' + (idDef ? _esc(idDef.label) : _esc(role || '未知')) + '</span></div>';
    if (idDef) {
      h += '<div class="pk-hint">' + _esc(idDef.desc) + '</div>';
    } else {
      h += '<div class="pk-hint">当前身份不在科举开放集合·开放身份：商贾/隐逸/宗室旁支/低级官吏子弟</div>';
    }
    h += '</div>';

    // 当前应试状态
    h += '<div class="pk-section"><div class="pk-section-title">应 试 状 态</div>';
    if (s && s.stage) {
      h += '<div class="pk-row"><span>阶段</span><span class="pk-val">' + _esc(_stageToLevel(s.stage)) + '</span></div>';
      h += '<div class="pk-row"><span>状态</span><span class="pk-val">' + _esc(_statusLabel(s.status)) + '</span></div>';
      h += '<div class="pk-row"><span>得分</span><span class="pk-val">' + s.score + '</span></div>';
      if (s.rank) h += '<div class="pk-row"><span>名次</span><span class="pk-val">第 ' + s.rank + ' 名</span></div>';
      if (s.tier) h += '<div class="pk-row"><span>层级</span><span class="pk-val">' + _esc(_tierLabel(s.tier)) + '</span></div>';
    } else if (s && s.graduated) {
      h += '<div class="pk-row"><span>已通过殿试</span><span class="pk-val">进士及第</span></div>';
      if (s.officialTitle) h += '<div class="pk-row"><span>授官</span><span class="pk-val">' + _esc(s.officialTitle) + '</span></div>';
      if (s.dept) h += '<div class="pk-row"><span>部门</span><span class="pk-val">' + _esc(s.dept) + '</span></div>';
    } else {
      h += '<div class="pk-empty">未在应试</div>';
    }
    h += '</div>';

    // 当前科举进行中信息
    if (exam) {
      h += '<div class="pk-section"><div class="pk-section-title">本 场 科 举</div>';
      h += '<div class="pk-row"><span>场次</span><span class="pk-val">' + _esc(exam.id || '未知') + '</span></div>';
      h += '<div class="pk-row"><span>类型</span><span class="pk-val">' + (exam.type === 'enke' ? '恩科' : '正科') + '</span></div>';
      if (exam.stage) h += '<div class="pk-row"><span>阶段</span><span class="pk-val">' + _esc(exam.stage) + '</span></div>';
      if (exam.chiefExaminer) h += '<div class="pk-row"><span>主考</span><span class="pk-val">' + _esc(exam.chiefExaminer) + '</span></div>';
      h += '</div>';
    }

    // 已拜师父
    if (s && s.masterName) {
      h += '<div class="pk-section"><div class="pk-section-title">拜 师 求 学</div>';
      h += '<div class="pk-row"><span>师父</span><span class="pk-val">' + _esc(s.masterName) + '</span></div>';
      if (s.masterType) {
        var mtDef = MASTER_TYPES[s.masterType];
        h += '<div class="pk-row"><span>门类</span><span class="pk-val">' + (mtDef ? _esc(mtDef.label) : _esc(s.masterType)) + '</span></div>';
      }
      h += '</div>';
    }

    // 应试历史
    if (s && s.history && s.history.length > 0) {
      h += '<div class="pk-section"><div class="pk-section-title">应 试 历 史 （近 ' + Math.min(s.history.length, 5) + ' 条）</div>';
      s.history.slice(-5).reverse().forEach(function (e) {
        if (!e) return;
        h += '<div class="pk-exam-row">';
        h += '<div class="pk-exam-head"><span>' + _esc(e.level || e.stage || '') + '</span><span class="pk-val">' + (e.score != null ? e.score + ' 分' : '') + '</span></div>';
        if (e.comment) h += '<div class="pk-exam-comment">' + _esc(e.comment) + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    // 弊案历史
    if (s && s.scandals && s.scandals.length > 0) {
      h += '<div class="pk-section"><div class="pk-section-title">弊 案 记 录 （' + s.scandals.length + ' 条）</div>';
      s.scandals.slice(-3).reverse().forEach(function (e) {
        if (!e) return;
        h += '<div class="pk-exam-row">';
        h += '<div class="pk-exam-head"><span>' + _esc(e.choiceLabel || e.choice || '') + '</span><span class="pk-val">' + (e.spawned ? '已触发' : '未触发') + '</span></div>';
        if (e.reason) h += '<div class="pk-exam-comment">' + _esc(e.reason) + '</div>';
        h += '</div>';
      });
      h += '</div>';
    }

    // 4 阶段报名入口提示
    h += '<div class="pk-section"><div class="pk-section-title">报 名 入 口</div>';
    h += '<div class="pk-hint">4 阶段·童试（含县试/府试/院试）→ 乡试 → 会试 → 殿试·剧本 hook 报名时机</div>';
    Object.keys(STAGE).forEach(function (k) {
      var st = STAGE[k];
      var fee = _getFee(st);
      h += '<div class="pk-row"><span>' + _esc(_stageToLevel(st)) + '</span><span class="pk-val">报名费 ' + fee + ' 两</span></div>';
    });
    h += '</div>';

    h += '</div>';

    // 内嵌样式（与 tm-player-trade.js / tm-player-economy.js 同风格·暗金主调）
    h += '<style>' +
      '.pk-panel{padding:0.8rem 1rem;background:linear-gradient(90deg,rgba(22,15,8,0.84),rgba(40,28,14,0.70) 46%,rgba(15,10,6,0.82));border:1px solid rgba(215,185,104,0.30);border-radius:3px;font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;}' +
      '.pk-panel-head{display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid rgba(215,185,104,0.30);padding-bottom:0.4rem;margin-bottom:0.6rem;}' +
      '.pk-panel-title{color:var(--gold-400);letter-spacing:0.2em;font-size:1.05rem;}' +
      '.pk-cash{color:var(--color-foreground-secondary);font-size:0.85rem;}' +
      '.pk-section{margin-bottom:0.6rem;}' +
      '.pk-section-title{font-size:0.85rem;color:var(--gold-400);letter-spacing:0.15em;margin-bottom:0.3rem;padding-left:0.4rem;border-left:2px solid var(--gold-500);}' +
      '.pk-row{display:flex;justify-content:space-between;padding:0.2rem 0.4rem;font-size:0.82rem;border-bottom:1px dashed rgba(215,185,104,0.10);}' +
      '.pk-val{color:var(--gold-400);}' +
      '.pk-empty{color:var(--color-foreground-muted);font-style:italic;padding:0.4rem;font-size:0.8rem;}' +
      '.pk-hint{font-size:0.72rem;color:var(--color-foreground-muted);padding:0.2rem 0.4rem;font-style:italic;}' +
      '.pk-exam-row{padding:0.3rem 0.4rem;background:var(--color-sunken);border-radius:var(--radius-md);margin-bottom:0.3rem;font-size:0.78rem;}' +
      '.pk-exam-head{display:flex;justify-content:space-between;margin-bottom:0.15rem;}' +
      '.pk-exam-comment{font-size:0.72rem;color:var(--color-foreground-muted);font-style:italic;}' +
      '</style>';

    if (targetEl && typeof targetEl === 'object') {
      try { targetEl.innerHTML = h; return null; } catch (_) { return h; }
    }
    return h;
  }

  function _statusLabel(status) {
    var map = {
      idle: '未应试',
      registered: '已报名',
      answering: '作答中',
      graded: '已评卷',
      passed: '已通过',
      failed: '未通过',
      promoted: '已授官'
    };
    return map[status] || status;
  }

  // ════════════════════════════════════════════════════════════
  //  §10 查询接口
  // ════════════════════════════════════════════════════════════

  function getCandidateState() {
    var s = _getState();
    if (!s) return null;
    // 返回快照·防外部直改
    return {
      stage: s.stage,
      status: s.status,
      currentLevel: s.currentLevel,
      currentExamId: s.currentExamId,
      candidateId: s.candidateId,
      score: s.score,
      rank: s.rank,
      tier: s.tier,
      masterName: s.masterName,
      masterType: s.masterType,
      schools: (s.schools || []).slice(),
      graduated: s.graduated,
      officialTitle: s.officialTitle,
      dept: s.dept
    };
  }

  function listExamHistory() {
    var s = _getState();
    if (!s || !s.history) return [];
    return s.history.slice();
  }

  function listMasters() {
    var s = _getState();
    if (!s || !s.schools) return [];
    return s.schools.slice();
  }

  function listScandals() {
    var s = _getState();
    if (!s || !s.scandals) return [];
    return s.scandals.slice();
  }

  // ════════════════════════════════════════════════════════════
  //  §11 导出（双路径挂载：global.TM.PlayerKeju + module.exports）
  // ════════════════════════════════════════════════════════════

  var ns = {
    // 常量
    STAGE: STAGE,
    EXAM_STATUS: EXAM_STATUS,
    IDENTITY_OPEN_CLASSES: IDENTITY_OPEN_CLASSES,
    SCANDAL_CHOICES: SCANDAL_CHOICES,
    QUESTION_TYPES: QUESTION_TYPES,
    MASTER_TYPES: MASTER_TYPES,
    DEFAULT_FEES: DEFAULT_FEES,

    // 查询
    getCandidateState: getCandidateState,
    listExamHistory: listExamHistory,
    listMasters: listMasters,
    listScandals: listScandals,

    // 主流程
    applyForExam: applyForExam,
    answerQuestion: answerQuestion,
    seekMaster: seekMaster,
    passDianshiAndPromote: passDianshiAndPromote,
    triggerScandal: triggerScandal,

    // 御案面板
    renderPanel: renderPanel,

    // 内部函数（smoke/调试·非游戏调用入口）
    _getState: _getState,
    _ensureState: _ensureState,
    _defaultState: _defaultState,
    _resetCandidate: _resetCandidate,
    _callLLM: _callLLM,
    _isTransmigration: _isTransmigration,
    _playerName: _playerName,
    _playerRole: _playerRole,
    _spendPlayerCash: _spendPlayerCash,
    _getPlayerCash: _getPlayerCash,
    _getFee: _getFee,
    _getCurrentExam: _getCurrentExam,
    _stageToLevel: _stageToLevel,
    _llmGradeAnswer: _llmGradeAnswer,
    _deterministicHash: _deterministicHash,
    _rankFromScore: _rankFromScore,
    _tierFromRank: _tierFromRank,
    _tierLabel: _tierLabel,
    _inferMasterType: _inferMasterType,
    _applyScandalRisk: _applyScandalRisk,
    _kjCalcAlignment: _kjCalcAlignment,
    _kjRenderExaminerHintBar: _kjRenderExaminerHintBar,
    _kjSpawnScandal: _kjSpawnScandal,
    _kjDispatchAllocation: _kjDispatchAllocation,
    _kjApplyAllocations: _kjApplyAllocations,
    _kjpInitSchoolNetwork: _kjpInitSchoolNetwork,
    _kjpGetActiveAcademies: _kjpGetActiveAcademies,
    _kjpSpawnShanzhang: _kjpSpawnShanzhang
  };

  TM.PlayerKeju = ns;

  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = { PlayerKeju: ns };
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
