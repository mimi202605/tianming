// ============================================================
// tm-player-reclaim.js — 穿越模式 Phase 4.5 · Task 23 玩家开垦荒地系统
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何朝代专属机构/职务/科场专名（具体禁词清单
//   见 lint 规则与项目铁律文档，本注释不一一列举）。引擎层只提供
//   「勘探 + 许可 + 施工 + 产出 + 副作用 + 朝廷互动」通用框架，
//   具体政策（屯田/占田/均田等）由剧本通过 P.customReclaimPolicies
//   覆盖/扩展，引擎绝不预置朝代特定政策专名。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerReclaim.{
//   SIZES, STAGES, PROJECT_STATUS, POLICY_TYPES,
//   getState, getProjects, getProjectById, getEvents,
//   surveyWasteland, requestPermission, hasPermission,
//   startIllegalReclaim, startConstruction, tickConstruction, advanceStage,
//   collectHarvest, triggerSideEffects,
//   petitionForMerit, triggerAccountability,
//   applyPolicyHook,
//   renderPanel
// }
// 依赖（运行时软依赖，缺席时降级）：
//   - TM.PlayerEconomy.spend / spendCash / addIncome  （银钱账本·tm-player-economy.js）
//   - TM.PlayerInteraction.interact                    （官府许可·tm-player-interaction.js）
//   - TM.Transmigration.isTransmigrationMode           （模式判定·tm-transmigration.js）
//   - global.callAI / callLLM                          （LLM 适配·与 tm-sovereign-ai.js 一致）
//   - GM._playerReclaim / GM.turn / GM.chars / P.playerInfo / P.customReclaimPolicies
// 双路径挂载：浏览器走 window.TM.PlayerReclaim；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  if (!global.TM) global.TM = {};

  // ════════════════════════════════════════════════════════════
  //  §1 SubTask 23.1 命名空间 + 23.7 规模常量 + 23.6 施工阶段 + 23.11 政策类型
  // ════════════════════════════════════════════════════════════

  // 三种规模·朝代中立·数值由引擎兜底·剧本可通过 P.customReclaimPolicies.sizes 覆盖
  //   small:  小块（百亩级·1 月可成·成本低·无需官府许可亦不算违规）
  //   medium: 中块（千亩级·3 月可成·成本中·需官府许可）
  //   large:  大块（万亩级·6-12 月可成·成本高·必官府许可·违规则触重谴）
  var SIZES = {
    small:  { label: '小块', monthsMin: 1, monthsMax: 1,  baseCost: 200,  baseOutput: 50,  workersMin: 5,   riskLevel: 'low'    },
    medium: { label: '中块', monthsMin: 3, monthsMax: 3,  baseCost: 800,  baseOutput: 200, workersMin: 20,  riskLevel: 'medium' },
    large:  { label: '大块', monthsMin: 6, monthsMax: 12, baseCost: 3000, baseOutput: 800, workersMin: 80,  riskLevel: 'high'   }
  };

  // 4 阶段施工流程·朝代中立（平整 → 修水利 → 播种 → 收获）
  var STAGES = ['leveling', 'irrigation', 'sowing', 'harvest'];
  var STAGE_LABELS = {
    leveling:    '平整土地',
    irrigation:  '修水利',
    sowing:      '播种',
    harvest:     '收获'
  };

  // 项目状态机·朝代中立
  var PROJECT_STATUS = {
    SURVEYING:      'surveying',       // 已勘探·待申请许可
    PENDING_PERMIT: 'pending-permit',  // 申请许可中
    PERMITTED:      'permitted',       // 已获许可·待开工
    ILLEGAL:        'illegal',         // 违规开工（未走许可流程）
    CONSTRUCTING:   'constructing',    // 施工中（4 阶段推进）
    COMPLETED:      'completed',       // 已完成·产出已收
    FAILED:         'failed',          // 失败（灾害/问责/退还）
    ABANDONED:      'abandoned'       // 主动放弃
  };

  // 跨朝代政策类型·剧本 hook 路径键名（引擎层朝代中立·绝不锚定某朝某代）
  //   屯田：军屯/民屯/商屯等·剧本 hook 后改 cost/output/shareRatio
  //   占田：限田/占田制等·剧本 hook 后改规模上限 + 副作用阈值
  //   均田：均田/授田等·剧本 hook 后改 shareRatio 倾向（民得大头）
  var POLICY_TYPES = {
    tunTian:  { label: '屯田', costMul: 0.8,  outputMul: 1.2,  shareRatio: 0.5, sideEffectCap: 'large' },
    zhanTian: { label: '占田', costMul: 1.0,  outputMul: 1.0,  shareRatio: 0.6, sideEffectCap: 'medium' },
    junTian:  { label: '均田', costMul: 1.1,  outputMul: 0.9,  shareRatio: 0.3, sideEffectCap: 'small'  }
  };

  // 副作用类型·朝代中立（侵占 + 生态事件·不锚定某朝某署）
  var SIDE_EFFECT_TYPES = {
    encroachPasture:  { label: '侵占牧场', severity: 'warning',  factionDelta: -10 },
    encroachForest:   { label: '侵占林地', severity: 'warning',  factionDelta: -8  },
    encroachHunt:     { label: '侵占猎场', severity: 'warning',  factionDelta: -12 },
    floodRisk:        { label: '水患隐患', severity: 'critical', ecoDelta: -15 },
    desertification:  { label: '沙化倾向', severity: 'critical', ecoDelta: -20 }
  };

  // ════════════════════════════════════════════════════════════
  //  §2 工具函数（朝代中立·软依赖降级）
  // ════════════════════════════════════════════════════════════

  function _isStr(v) { return typeof v === 'string'; }
  function _isNum(v) { return typeof v === 'number' && !isNaN(v); }
  function _clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
  function _rnd(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

  function _rndId(prefix) {
    return (prefix || 'pr_') + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  }

  function _turn() {
    try { if (typeof GM !== 'undefined' && GM && _isNum(GM.turn)) return GM.turn; } catch (_) {}
    return 0;
  }

  function _toast(m) {
    if (typeof toast === 'function') { try { toast(m); return; } catch (_) {} }
    try { console.log('[PlayerReclaim]', m); } catch (_) {}
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

  // LLM 调用·主路径 global.callAI·备用 callLLM·缺席返回 null
  function _callLLM(prompt) {
    try { if (typeof global.callAI === 'function') return global.callAI(prompt); } catch (_) {}
    try { if (typeof callAI === 'function') return callAI(prompt); } catch (_) {}
    try { if (typeof callLLM === 'function') return callLLM(prompt); } catch (_) {}
    return null;
  }

  // 玩家当前所在地（关联 tm-player-movement.js·缺席降级 P.playerInfo.location）
  function _playerLocation() {
    try {
      if (global.TM && global.TM.PlayerMovement && typeof global.TM.PlayerMovement.getCurrentLocation === 'function') {
        var loc = global.TM.PlayerMovement.getCurrentLocation();
        if (loc) return loc;
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (_isStr(P.playerInfo.currentLocation) && P.playerInfo.currentLocation) return P.playerInfo.currentLocation;
        if (_isStr(P.playerInfo.location) && P.playerInfo.location) return P.playerInfo.location;
      }
    } catch (_) {}
    return '';
  }

  // 玩家官场关系分（关联官制权限·决定能否在当地申领许可）
  function _playerOfficialRelation() {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (_isNum(P.playerInfo.officialRelation)) return P.playerInfo.officialRelation;
        if (_isNum(P.playerInfo.sovereignRelation)) return P.playerInfo.sovereignRelation;
      }
    } catch (_) {}
    return 50;
  }

  // 扣银钱·主路径走 TM.PlayerEconomy（task spec 接口约定）
  function _spendCash(amount, label) {
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
    // 降级·直接扣 P.playerInfo.money
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

  // 入账·主路径走 TM.PlayerEconomy.addIncome
  function _addIncome(amount, source, reason) {
    try {
      if (global.TM && global.TM.PlayerEconomy && typeof global.TM.PlayerEconomy.addIncome === 'function') {
        var r = global.TM.PlayerEconomy.addIncome(source, amount, { reason: reason });
        if (r && r.ok) return { ok: true, cash: r.cash };
        if (r && r.ok === false) return r;
      }
    } catch (_) {}
    // 降级·直接加 P.playerInfo.money
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (_isNum(P.playerInfo.money)) {
          P.playerInfo.money = (P.playerInfo.money || 0) + amount; // arch-ok
          return { ok: true, cash: P.playerInfo.money };
        }
        if (_isNum(P.playerInfo.cash)) {
          P.playerInfo.cash = (P.playerInfo.cash || 0) + amount; // arch-ok
          return { ok: true, cash: P.playerInfo.cash };
        }
      }
    } catch (_) {}
    return { ok: false, reason: '账本未就绪' };
  }

  // ════════════════════════════════════════════════════════════
  //  §3 SubTask 23.2 开垦状态账本
  // ════════════════════════════════════════════════════════════
  //
  // 账本挂在 GM._playerReclaim（task spec 规范 5·arch-ok 行内豁免）：
  //   {
  //     projects: [ { id, region, size, progress, stage, stageIdx, workers, status,
  //                   expectedOutput, costEstimate, monthlyCost, startedTurn, expectedTurns,
  //                   hasPermission, permissionSource, sideEffects, shareRatio,
  //                   actualOutput, policy, surveyorTurn } ],
  //     events:   [ { id, projectId, type, severity, message, turn, payload } ],
  //     stats:    { totalSurveyed, totalCompleted, totalFailed, totalOutput, totalIncome }
  //   }

  function _defaultState() {
    return {
      projects: [],
      events: [],
      stats: { totalSurveyed: 0, totalCompleted: 0, totalFailed: 0, totalOutput: 0, totalIncome: 0 }
    };
  }

  function _ensureState() {
    try {
      if (typeof GM === 'undefined' || !GM) return null;
      if (!GM._playerReclaim || typeof GM._playerReclaim !== 'object') {
        GM._playerReclaim = _defaultState(); // arch-ok (玩家开垦账本初始化·task spec 规范 5)
      }
      var st = GM._playerReclaim;
      if (!Array.isArray(st.projects)) st.projects = []; // arch-ok
      if (!Array.isArray(st.events)) st.events = []; // arch-ok
      if (!st.stats || typeof st.stats !== 'object') {
        st.stats = { totalSurveyed: 0, totalCompleted: 0, totalFailed: 0, totalOutput: 0, totalIncome: 0 }; // arch-ok
      }
      // 容错·保证 stats 字段齐
      ['totalSurveyed','totalCompleted','totalFailed','totalOutput','totalIncome'].forEach(function (k) {
        if (!_isNum(st.stats[k])) st.stats[k] = 0; // arch-ok
      });
      return st;
    } catch (_) { return null; }
  }

  function getState() {
    var st = _ensureState();
    return st ? JSON.parse(JSON.stringify(st)) : null;
  }

  function getProjects() {
    var st = _ensureState();
    return st ? st.projects.slice() : [];
  }

  function getProjectById(id) {
    var st = _ensureState();
    if (!st || !id) return null;
    for (var i = 0; i < st.projects.length; i++) {
      if (st.projects[i] && st.projects[i].id === id) return st.projects[i];
    }
    return null;
  }

  function getEvents() {
    var st = _ensureState();
    return st ? st.events.slice() : [];
  }

  function _pushEvent(st, projectId, type, severity, message, payload) {
    var ev = {
      id: _rndId('ev_'),
      projectId: projectId || null,
      type: type,
      severity: severity || 'info',
      message: message || '',
      turn: _turn(),
      payload: payload || null
    };
    st.events.push(ev); // arch-ok (玩家开垦账本 events 写入)
    if (st.events.length > 200) st.events = st.events.slice(-200); // arch-ok
    return ev;
  }

  // ════════════════════════════════════════════════════════════
  //  §4 SubTask 23.11 跨朝代政策 hook·合并默认 + 剧本
  // ════════════════════════════════════════════════════════════
  //
  // 剧本挂载点：P.customReclaimPolicies
  //   形态 A（覆盖默认政策）：{ tunTian: { costMul: 0.7, ... } }
  //   形态 B（追加新政策键）：{ shiTian: { label:'食田', ... } }
  //   形态 C（覆盖规模表）：{ sizes: { small: { ... } } }
  //   形态 D（覆盖副作用阈值）：{ sideEffectThresholds: { ... } }
  // 返回深合并后的 policies 对象（每次调用都 fresh merge·不污染默认数据）

  function _deepClonePolicies() {
    var out = { policies: {}, sizes: {} };
    Object.keys(POLICY_TYPES).forEach(function (k) {
      var p = POLICY_TYPES[k];
      out.policies[k] = {
        label: p.label,
        costMul: p.costMul,
        outputMul: p.outputMul,
        shareRatio: p.shareRatio,
        sideEffectCap: p.sideEffectCap
      };
    });
    Object.keys(SIZES).forEach(function (k) {
      var s = SIZES[k];
      out.sizes[k] = {
        label: s.label,
        monthsMin: s.monthsMin,
        monthsMax: s.monthsMax,
        baseCost: s.baseCost,
        baseOutput: s.baseOutput,
        workersMin: s.workersMin,
        riskLevel: s.riskLevel
      };
    });
    return out;
  }

  function getPolicies() {
    var merged = _deepClonePolicies();
    try {
      if (typeof P === 'undefined' || !P || !P.customReclaimPolicies) return merged;
      var cr = P.customReclaimPolicies;
      // 形态 A/B：覆盖/追加 policies
      if (cr.policies && typeof cr.policies === 'object') {
        Object.keys(cr.policies).forEach(function (k) {
          var ext = cr.policies[k];
          if (!ext || typeof ext !== 'object') return;
          var base = merged.policies[k] || { label: k, costMul: 1, outputMul: 1, shareRatio: 0.5, sideEffectCap: 'medium' };
          merged.policies[k] = {
            label: _isStr(ext.label) ? ext.label : base.label,
            costMul: _isNum(ext.costMul) ? ext.costMul : base.costMul,
            outputMul: _isNum(ext.outputMul) ? ext.outputMul : base.outputMul,
            shareRatio: _isNum(ext.shareRatio) ? _clamp(ext.shareRatio, 0, 1) : base.shareRatio,
            sideEffectCap: _isStr(ext.sideEffectCap) ? ext.sideEffectCap : base.sideEffectCap
          };
        });
      }
      // 形态 C：覆盖规模表
      if (cr.sizes && typeof cr.sizes === 'object') {
        Object.keys(cr.sizes).forEach(function (k) {
          var ext = cr.sizes[k];
          if (!ext || typeof ext !== 'object') return;
          var base = merged.sizes[k] || { label: k, monthsMin: 1, monthsMax: 1, baseCost: 100, baseOutput: 50, workersMin: 5, riskLevel: 'low' };
          merged.sizes[k] = {
            label: _isStr(ext.label) ? ext.label : base.label,
            monthsMin: _isNum(ext.monthsMin) ? ext.monthsMin : base.monthsMin,
            monthsMax: _isNum(ext.monthsMax) ? ext.monthsMax : base.monthsMax,
            baseCost: _isNum(ext.baseCost) ? ext.baseCost : base.baseCost,
            baseOutput: _isNum(ext.baseOutput) ? ext.baseOutput : base.baseOutput,
            workersMin: _isNum(ext.workersMin) ? ext.workersMin : base.workersMin,
            riskLevel: _isStr(ext.riskLevel) ? ext.riskLevel : base.riskLevel
          };
        });
      }
    } catch (_) {}
    return merged;
  }

  function _getSizeSpec(size) {
    var merged = getPolicies();
    return merged.sizes[size] || null;
  }

  function _getPolicySpec(policyKey) {
    if (!policyKey) return null;
    var merged = getPolicies();
    return merged.policies[policyKey] || null;
  }

  // ════════════════════════════════════════════════════════════
  //  §5 SubTask 23.3 "勘探荒地"·3 种规模 + 成本预估
  // ════════════════════════════════════════════════════════════
  //
  // surveyWasteland(region, size, opts):
  //   1) 校验 region/size·玩家需到当地（关联 PlayerMovement·缺席降级）
  //   2) 按 size 查规模表 + 政策 hook·计算成本预估 + 预期产出
  //   3) 不扣银钱·只产出"勘探报告"·返回 projectId（状态 SURVEYING）
  //   4) 写入 projects[]·stats.totalSurveyed += 1
  // 返回 { ok, projectId, region, size, costEstimate, expectedOutput, months, workersNeeded, needsPermission, ... }

  function _estimateMonths(sizeSpec) {
    return _rnd(sizeSpec.monthsMin, sizeSpec.monthsMax);
  }

  function _estimateWorkers(sizeSpec) {
    // workersMin 是"招工下限"·估算在 [workersMin, 1.2×workersMin] 浮动·不下穿下限
    return Math.round(sizeSpec.workersMin * (1.0 + Math.random() * 0.2));
  }

  function surveyWasteland(region, size, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    if (!_isStr(region) || !region) return { ok: false, reason: '须指定勘探区域' };
    var sizeSpec = _getSizeSpec(size);
    if (!sizeSpec) return { ok: false, reason: '未知开垦规模: ' + size };

    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };

    // 玩家是否需要到当地（剧本可关·opts.skipLocationCheck）
    if (!opts.skipLocationCheck) {
      var curLoc = _playerLocation();
      if (curLoc && curLoc !== region) {
        return { ok: false, reason: '需先至当地（当前在 ' + curLoc + '）', code: 'not-on-site' };
      }
    }

    // 同区域同规模不可重复勘探（避免空账）
    for (var i = 0; i < st.projects.length; i++) {
      var p = st.projects[i];
      if (p && p.region === region && p.size === size && p.status !== PROJECT_STATUS.ABANDONED && p.status !== PROJECT_STATUS.FAILED) {
        return { ok: false, reason: '该区域已有同规模项目: ' + p.id, code: 'duplicate' };
      }
    }

    // 计算成本与产出（政策 hook 影响）
    var policyKey = _isStr(opts.policy) ? opts.policy : null;
    var policySpec = _getPolicySpec(policyKey);
    var costMul = policySpec ? policySpec.costMul : 1;
    var outputMul = policySpec ? policySpec.outputMul : 1;
    var shareRatio = policySpec ? policySpec.shareRatio : 0.4;

    // 成本 = 规模 baseCost × 政策 costMul × 区域难度系数（1.0~1.3·朝代中立·剧本可调）
    var regionDifficulty = _regionDifficulty(region);
    var costEstimate = Math.round(sizeSpec.baseCost * costMul * regionDifficulty);
    // 预期产出 = 规模 baseOutput × 政策 outputMul × 区域肥力系数（0.8~1.2）
    var regionFertility = _regionFertility(region);
    var expectedOutput = Math.round(sizeSpec.baseOutput * outputMul * regionFertility);
    var months = _estimateMonths(sizeSpec);
    var workersNeeded = _estimateWorkers(sizeSpec);

    // 是否需要官府许可（small 免·medium+ 必需）
    var needsPermission = (size !== 'small');

    // 创建项目
    var proj = {
      id: _rndId('pr_'),
      region: region,
      size: size,
      progress: 0,
      stage: STAGES[0],
      stageIdx: 0,
      workers: workersNeeded,
      status: PROJECT_STATUS.SURVEYING,
      expectedOutput: expectedOutput,
      costEstimate: costEstimate,
      monthlyCost: Math.round(costEstimate / months),
      startedTurn: _turn(),
      expectedTurns: months,
      hasPermission: !needsPermission,
      permissionSource: needsPermission ? null : 'auto',
      sideEffects: [],
      shareRatio: shareRatio,
      actualOutput: 0,
      policy: policyKey,
      surveyorTurn: _turn(),
      regionDifficulty: regionDifficulty,
      regionFertility: regionFertility
    };
    st.projects.push(proj); // arch-ok (玩家开垦账本 projects 写入)
    st.stats.totalSurveyed += 1; // arch-ok

    _pushEvent(st, proj.id, 'surveyed', 'info', '勘探荒地·' + region + '·' + sizeSpec.label + '·预估成本 ' + costEstimate + ' 两·预期产粮 ' + expectedOutput + ' 石', {
      region: region, size: size, costEstimate: costEstimate, expectedOutput: expectedOutput
    });

    return {
      ok: true,
      projectId: proj.id,
      region: region,
      size: size,
      sizeLabel: sizeSpec.label,
      costEstimate: costEstimate,
      expectedOutput: expectedOutput,
      months: months,
      workersNeeded: workersNeeded,
      needsPermission: needsPermission,
      shareRatio: shareRatio,
      policy: policyKey
    };
  }

  // 区域难度系数·朝代中立·剧本可通过 P.customReclaimPolicies.regionModifiers 覆盖
  function _regionDifficulty(region) {
    var base = 1.0;
    try {
      if (typeof P !== 'undefined' && P && P.customReclaimPolicies && P.customReclaimPolicies.regionModifiers) {
        var rm = P.customReclaimPolicies.regionModifiers[region];
        if (rm && _isNum(rm.difficulty)) return _clamp(rm.difficulty, 0.5, 2.0);
      }
    } catch (_) {}
    // 兜底·按区域名 hash 推 1.0~1.3
    if (_isStr(region)) {
      var h = 0;
      for (var i = 0; i < region.length; i++) h = (h * 31 + region.charCodeAt(i)) & 0xffff;
      base = 1.0 + (h % 31) / 100; // 1.00~1.30
    }
    return base;
  }

  // 区域肥力系数·朝代中立·剧本可通过 P.customReclaimPolicies.regionModifiers 覆盖
  function _regionFertility(region) {
    var base = 1.0;
    try {
      if (typeof P !== 'undefined' && P && P.customReclaimPolicies && P.customReclaimPolicies.regionModifiers) {
        var rm = P.customReclaimPolicies.regionModifiers[region];
        if (rm && _isNum(rm.fertility)) return _clamp(rm.fertility, 0.3, 2.0);
      }
    } catch (_) {}
    if (_isStr(region)) {
      var h = 0;
      for (var i = 0; i < region.length; i++) h = (h * 17 + region.charCodeAt(i)) & 0xffff;
      base = 0.8 + (h % 41) / 100; // 0.80~1.20
    }
    return base;
  }

  // ════════════════════════════════════════════════════════════
  //  §6 SubTask 23.4 "官府许可前置"·关联人物互动 + 官制权限
  // ════════════════════════════════════════════════════════════
  //
  // requestPermission(projectId, opts):
  //   1) 调 TM.PlayerInteraction.interact(official, 'entrust', payload)·向当地官府请托
  //   2) 官制权限：玩家官场关系分 + officialTitle 决定许可概率
  //   3) LLM 路径：global.callAI(prompt)·文本含"准"/"允" → 准
  //   4) 缺席 LLM·规则引擎兜底：玩家官场关系 + 规模 riskLevel 影响
  //   5) 准 → project.hasPermission=true·status=PERMITTED
  //   6) 不准 → status 仍 SURVEYING·可重试或转违规路径
  // 返回 { ok, projectId, approved, official, scene, ... }

  function _localOfficial(region) {
    // 在 GM.chars 中找当地官府 NPC（官职含 守/令/尹/尉/丞 等通称·朝代中立）
    try {
      if (typeof GM === 'undefined' || !GM || !Array.isArray(GM.chars)) return null;
      var re = /守|令|尹|尉|丞|长史|主簿|县公|郡公|州牧|刺史|知事/;
      var candidates = [];
      for (var i = 0; i < GM.chars.length; i++) {
        var c = GM.chars[i];
        if (!c || c.alive === false) continue;
        var bag = ((c.officialTitle || '') + ' ' + (c.title || '') + ' ' + (c.role || ''));
        if (re.test(bag)) candidates.push(c);
        // 优先匹配同区域
        if (c.location === region && re.test(bag)) return c;
      }
      if (candidates.length) return candidates[0];
      // 兜底·返回第一个非玩家非君主角色
      for (var j = 0; j < GM.chars.length; j++) {
        var c2 = GM.chars[j];
        if (!c2 || c2.alive === false) continue;
        if (c2.isPlayer) continue;
        if (c2.role === '皇帝') continue;
        return c2;
      }
    } catch (_) {}
    return null;
  }

  function _isApprovedByRule(project, official) {
    // 规则引擎·许可概率 = 0.3 + 官场关系×0.005 - riskLevel 系数
    var relation = _playerOfficialRelation();
    var riskAdj = project.size === 'large' ? 0.2 : (project.size === 'medium' ? 0.1 : 0);
    var prob = 0.4 + relation * 0.005 - riskAdj;
    prob = _clamp(prob, 0.05, 0.95);
    return { adopt: Math.random() < prob, source: 'rule', prob: prob };
  }

  function _isApprovedByLLM(prompt) {
    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string') {
      var s = llm.trim();
      // 否定形式先匹·避免"不允/不准"被肯定正则误判
      if (/不允|不准|不予|驳回|拒绝|驳斥|否决|未准|不纳|不许/.test(s)) {
        return { adopt: false, source: 'llm', raw: s };
      }
      if (/不|拒|驳|否|却/.test(s)) return { adopt: false, source: 'llm', raw: s };
      if (/准|允|可|然|许/.test(s)) return { adopt: true, source: 'llm', raw: s };
    }
    return null;
  }

  function requestPermission(projectId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };
    var proj = getProjectById(projectId);
    if (!proj) return { ok: false, reason: '未找到项目: ' + projectId };
    if (proj.hasPermission) return { ok: false, reason: '已获许可', code: 'already-permitted' };
    if (proj.status === PROJECT_STATUS.ILLEGAL) return { ok: false, reason: '已违规开垦·不可补办', code: 'already-illegal' };

    var region = proj.region;
    var official = opts.officialName ? _findCharByName(opts.officialName) : _localOfficial(region);
    var officialName = (official && official.name) || '当地官府';

    // 1) 关联人物互动·向当地官府请托（entrust = 请托）
    var interactR = null;
    try {
      if (global.TM && global.TM.PlayerInteraction && typeof global.TM.PlayerInteraction.interact === 'function') {
        interactR = global.TM.PlayerInteraction.interact(officialName, 'entrust', {
          topic: '请领开垦荒地·' + region + '·' + (SIZES[proj.size] || {}).label,
          intent: opts.intent || '请领开垦许可'
        });
      }
    } catch (_) {}
    if (!interactR || interactR.ok === false) {
      return { ok: false, reason: (interactR && interactR.reason) || '请托互动失败', interact: interactR };
    }

    // 2) LLM 决策·缺席走规则引擎
    var prompt = [
      '【官府批奏·开垦许可】',
      '玩家奏请开垦：' + region + '·' + (SIZES[proj.size] || {}).label + '荒地',
      '预期产粮：' + proj.expectedOutput + ' 石·需工 ' + proj.workers + ' 人·工期 ' + proj.expectedTurns + ' 月',
      '请以当地官府口吻批复是否准许开垦（含"准"或"不"字样以判定）。'
    ].filter(Boolean).join('\n');
    var decision = _isApprovedByLLM(prompt);
    if (!decision) decision = _isApprovedByRule(proj, official);

    // 3) 写状态
    if (decision.adopt) {
      proj.hasPermission = true; // arch-ok
      proj.permissionSource = 'official'; // arch-ok
      proj.status = PROJECT_STATUS.PERMITTED; // arch-ok
      _pushEvent(st, proj.id, 'permitted', 'info', '官府许可·' + region + '·' + (SIZES[proj.size] || {}).label + '·批文由 ' + officialName + ' 出', { official: officialName });
    } else {
      _pushEvent(st, proj.id, 'permit-denied', 'warning', '官府未准·' + region + '·' + (SIZES[proj.size] || {}).label + '·可重试或转违规', { official: officialName });
    }

    return {
      ok: true,
      projectId: proj.id,
      approved: !!decision.adopt,
      decision: decision,
      official: officialName,
      scene: interactR.scene,
      interact: interactR
    };
  }

  function _findCharByName(name) {
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

  function hasPermission(projectId) {
    var proj = getProjectById(projectId);
    return !!(proj && proj.hasPermission);
  }

  // ════════════════════════════════════════════════════════════
  //  §7 SubTask 23.5 "违规开垦"·触发占田风险（言官弹劾/强令退还）
  // ════════════════════════════════════════════════════════════
  //
  // startIllegalReclaim(projectId, opts):
  //   - 未获许可直接开工·status=ILLEGAL·触发占田风险
  //   - 风险等级：small 10% / medium 35% / large 70%
  //   - 触发后写 events[]·severity='critical'·message 含"占田/弹劾/退还"
  //   - 返回 { ok, projectId, status, riskTriggered, riskType, ... }

  var ILLEGAL_RISK_BY_SIZE = { small: 0.10, medium: 0.35, large: 0.70 };

  function startIllegalReclaim(projectId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };
    var proj = getProjectById(projectId);
    if (!proj) return { ok: false, reason: '未找到项目: ' + projectId };
    if (proj.hasPermission) return { ok: false, reason: '已获许可·无需违规路径', code: 'already-permitted' };
    if (proj.status === PROJECT_STATUS.ILLEGAL) return { ok: false, reason: '已违规开垦', code: 'already-illegal' };
    if (proj.status === PROJECT_STATUS.COMPLETED || proj.status === PROJECT_STATUS.CONSTRUCTING) {
      return { ok: false, reason: '项目已在施工/已完·不可转违规', code: 'wrong-stage' };
    }

    // 标记违规·进入施工
    proj.status = PROJECT_STATUS.ILLEGAL; // arch-ok
    proj.permissionSource = 'illegal'; // arch-ok
    proj.hasPermission = false; // arch-ok
    proj.stage = STAGES[0]; // arch-ok
    proj.stageIdx = 0; // arch-ok

    // 扣开工成本（首期月成本）
    var spendR = _spendCash(proj.monthlyCost, '违规开垦·首期·' + proj.region);
    if (!spendR.ok) {
      // 银钱不足·回滚状态
      proj.status = PROJECT_STATUS.SURVEYING; // arch-ok
      proj.permissionSource = null; // arch-ok
      return { ok: false, reason: '银钱不足（需 ' + proj.monthlyCost + '）', code: 'no-cash', need: proj.monthlyCost };
    }

    // 触发占田风险
    var risk = ILLEGAL_RISK_BY_SIZE[proj.size] || 0.3;
    if (opts.forceRisk === true) risk = 1.0;
    if (opts.forceRisk === false) risk = 0.0;
    var triggered = Math.random() < risk;
    var riskType = null;
    if (triggered) {
      // 风险类型：言官弹劾 / 强令退还 / 没收已开垦地
      var riskTypes = ['impeachment', 'forced-return', 'confiscation'];
      riskType = riskTypes[_rnd(0, riskTypes.length - 1)];
      var riskMsg = '';
      if (riskType === 'impeachment') riskMsg = '言官弹劾·未领官府许可擅开荒地·奏疏已达天听';
      else if (riskType === 'forced-return') riskMsg = '官府强令退还·已开垦地被勒令归还原主';
      else riskMsg = '没收已开垦地·前期投入一并归公';
      _pushEvent(st, proj.id, 'illegal-risk:' + riskType, 'critical', '违规开垦·' + riskMsg, { size: proj.size, region: proj.region });

      // 触发吏治腐败引擎风险（沿用 tm-corruption-engine.js lumpSumIncidents 路径）
      _triggerCorruptionRisk('illegal-reclaim', proj.costEstimate, { player: '玩家', region: proj.region });

      // 强令退还 / 没收 → 项目失败
      if (riskType === 'forced-return' || riskType === 'confiscation') {
        proj.status = PROJECT_STATUS.FAILED; // arch-ok
        proj.actualOutput = 0; // arch-ok
        st.stats.totalFailed += 1; // arch-ok
      }
    } else {
      _pushEvent(st, proj.id, 'illegal-no-risk', 'info', '违规开垦·暂未事发', { size: proj.size });
    }

    return {
      ok: true,
      projectId: proj.id,
      status: proj.status,
      riskTriggered: triggered,
      riskType: riskType,
      monthlyCost: proj.monthlyCost,
      cash: spendR.cash
    };
  }

  function _triggerCorruptionRisk(kind, amount, opts) {
    try {
      if (typeof GM === 'undefined' || !GM) return;
      if (!GM.corruption) GM.corruption = {}; // arch-ok
      if (!Array.isArray(GM.corruption.lumpSumIncidents)) {
        GM.corruption.lumpSumIncidents = []; // arch-ok
      }
      var pi = (typeof P !== 'undefined' && P && P.playerInfo) ? P.playerInfo : null;
      var who = (pi && pi.characterName) ? pi.characterName : '玩家';
      var incident = {
        id: 'pr_' + kind + '_' + _turn() + '_' + Math.random().toString(36).slice(2, 6),
        name: who + '·违规开垦',
        type: 'player_illegal_reclaim',
        amount: amount,
        ratioToAnnual: 0,
        peakCorruption: amount * 0.0002,
        currentCorruption: amount * 0.0002 * 0.5,
        depts: { central: amount * 0.3, provincial: amount * 0.5, fiscal: amount * 0.2 },
        startTurn: _turn(),
        expectedDuration: 6,
        urgent: false,
        directPeopleBurden: false,
        status: 'active',
        source: 'player-reclaim',
        kind: kind
      };
      GM.corruption.lumpSumIncidents.push(incident); // arch-ok
    } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════
  //  §8 SubTask 23.6 + 23.7 "开垦施工"·4 阶段流程 + 不同规模时间
  // ════════════════════════════════════════════════════════════
  //
  // startConstruction(projectId, opts):
  //   1) 校验：必须 hasPermission 或 status=ILLEGAL 才能开工
  //   2) 扣首期月成本·status=CONSTRUCTING·stage=leveling
  //   3) 每月推进 tickConstruction()·每阶段推进 expectedTurns/4 个月
  //   4) 4 阶段：leveling(平整) → irrigation(修水利) → sowing(播种) → harvest(收获)
  //   5) 大规模触发副作用（23.9）·失败可触发问责（23.10）
  //   6) 完成后 status=COMPLETED·可 collectHarvest 收产出

  function startConstruction(projectId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };
    var proj = getProjectById(projectId);
    if (!proj) return { ok: false, reason: '未找到项目: ' + projectId };
    if (proj.status === PROJECT_STATUS.CONSTRUCTING) return { ok: false, reason: '已在施工中', code: 'already-constructing' };
    if (proj.status === PROJECT_STATUS.COMPLETED) return { ok: false, reason: '已完成·不可重复开工', code: 'already-completed' };
    if (proj.status === PROJECT_STATUS.FAILED || proj.status === PROJECT_STATUS.ABANDONED) {
      return { ok: false, reason: '项目已终止·不可开工', code: 'terminated' };
    }
    // 必须有许可（或为违规）
    if (!proj.hasPermission && proj.status !== PROJECT_STATUS.ILLEGAL) {
      return { ok: false, reason: '未获官府许可·请先 requestPermission 或 startIllegalReclaim', code: 'no-permission' };
    }

    // 扣首期月成本
    var spendR = _spendCash(proj.monthlyCost, '开垦首期·' + proj.region + '·' + proj.size);
    if (!spendR.ok) {
      return { ok: false, reason: '银钱不足（需 ' + proj.monthlyCost + '）', code: 'no-cash', need: proj.monthlyCost };
    }

    // 进入施工·阶段 0 = leveling
    proj.status = PROJECT_STATUS.CONSTRUCTING; // arch-ok
    proj.stage = STAGES[0]; // arch-ok
    proj.stageIdx = 0; // arch-ok
    proj.progress = 0; // arch-ok
    if (!proj.startedTurn) proj.startedTurn = _turn(); // arch-ok

    // 大规模 + 已触发违规 → 立即检查副作用（23.9）
    var sideEff = null;
    if (proj.size !== 'small') {
      sideEff = triggerSideEffects(proj.id, { silent: true });
    }

    _pushEvent(st, proj.id, 'construction-started', 'info', '开垦施工·' + proj.region + '·' + proj.size + '·工期 ' + proj.expectedTurns + ' 月·首期扣 ' + proj.monthlyCost + ' 两', {
      size: proj.size, monthlyCost: proj.monthlyCost, expectedTurns: proj.expectedTurns
    });

    return {
      ok: true,
      projectId: proj.id,
      status: proj.status,
      stage: proj.stage,
      stageIdx: proj.stageIdx,
      monthlyCost: proj.monthlyCost,
      cash: spendR.cash,
      sideEffects: sideEff
    };
  }

  // 每月推进施工·由 endturn pipeline 调用
  //   每 tick 推进 1 个月·扣月成本·推进进度·满阶段切下一阶段
  function tickConstruction(opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };

    var advanced = [];
    var completed = [];
    var failed = [];
    for (var i = 0; i < st.projects.length; i++) {
      var proj = st.projects[i];
      if (!proj || proj.status !== PROJECT_STATUS.CONSTRUCTING) continue;

      // 扣月成本·不足则失败
      var spendR = _spendCash(proj.monthlyCost, '开垦月支·' + proj.region);
      if (!spendR.ok) {
        proj.status = PROJECT_STATUS.FAILED; // arch-ok
        st.stats.totalFailed += 1; // arch-ok
        _pushEvent(st, proj.id, 'construction-failed', 'critical', '开垦失败·资金不济·' + proj.region, { reason: 'no-cash' });
        failed.push(proj.id);
        // 触发问责（23.10）
        triggerAccountability(proj.id, { reason: '资金不济·开垦失败', silent: true });
        continue;
      }

      // 推进进度·每阶段 = 100/expectedTurns × 1 月 = 100/expectedTurns
      // 总进度 = 4 阶段 × (100/expectedTurns) 月 = 100%
      // 简化：每 tick 推进 100/expectedTurns·满 25% 切下一阶段
      var stageStep = 100 / proj.expectedTurns;
      proj.progress = _clamp(proj.progress + stageStep, 0, 100); // arch-ok

      // 切阶段·满 25% 进 leveling→irrigation·50%→sowing·75%→harvest·100%→完成
      var newStageIdx = Math.min(STAGES.length - 1, Math.floor(proj.progress / 25));
      if (newStageIdx > proj.stageIdx) {
        proj.stageIdx = newStageIdx; // arch-ok
        proj.stage = STAGES[newStageIdx]; // arch-ok
        _pushEvent(st, proj.id, 'stage-advanced', 'info', '阶段推进·' + STAGE_LABELS[proj.stage] + '·进度 ' + Math.round(proj.progress) + '%', { stage: proj.stage, stageIdx: proj.stageIdx });
        // 大规模阶段推进触发副作用检查
        if (proj.size === 'large' && newStageIdx >= 2) {
          triggerSideEffects(proj.id, { silent: true });
        }
      }

      // 满 100% → 收获阶段完成
      if (proj.progress >= 100) {
        proj.stage = STAGES[STAGES.length - 1]; // arch-ok
        proj.stageIdx = STAGES.length - 1; // arch-ok
        proj.status = PROJECT_STATUS.COMPLETED; // arch-ok
        st.stats.totalCompleted += 1; // arch-ok
        _pushEvent(st, proj.id, 'construction-completed', 'info', '开垦完成·' + proj.region + '·待收获', { expectedOutput: proj.expectedOutput });
        completed.push(proj.id);
      } else {
        advanced.push({ projectId: proj.id, progress: proj.progress, stage: proj.stage, stageIdx: proj.stageIdx });
      }
    }

    return { ok: true, advanced: advanced, completed: completed, failed: failed };
  }

  function advanceStage(projectId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };
    var proj = getProjectById(projectId);
    if (!proj) return { ok: false, reason: '未找到项目: ' + projectId };
    if (proj.status !== PROJECT_STATUS.CONSTRUCTING) return { ok: false, reason: '项目未在施工中', code: 'not-constructing' };
    if (proj.stageIdx >= STAGES.length - 1) return { ok: false, reason: '已在最后阶段', code: 'last-stage' };
    proj.stageIdx += 1; // arch-ok
    proj.stage = STAGES[proj.stageIdx]; // arch-ok
    // 进度同步推到该阶段起始（25% 倍数）
    proj.progress = Math.max(proj.progress, proj.stageIdx * 25); // arch-ok
    _pushEvent(st, proj.id, 'stage-advanced', 'info', '阶段推进·' + STAGE_LABELS[proj.stage], { stage: proj.stage, stageIdx: proj.stageIdx });
    return { ok: true, projectId: proj.id, stage: proj.stage, stageIdx: proj.stageIdx, progress: proj.progress };
  }

  // ════════════════════════════════════════════════════════════
  //  §9 SubTask 23.8 "开垦产出"·粮食分成
  // ════════════════════════════════════════════════════════════
  //
  // collectHarvest(projectId, opts):
  //   1) 项目必须 status=COMPLETED·未收产出
  //   2) 实际产出 = expectedOutput × 收成波动（0.7~1.3）× 副作用惩罚
  //   3) 玩家享分成 = actualOutput × shareRatio
  //   4) 当地粮食增量 = actualOutput × (1 - shareRatio)·写入 GM.regionGrainYield 或 GM.adminHierarchy[region].grainYield
  //   5) 玩家分成转银钱（按 P.customReclaimPolicies.grainPrice 兜底 5 两/石）

  function collectHarvest(projectId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };
    var proj = getProjectById(projectId);
    if (!proj) return { ok: false, reason: '未找到项目: ' + projectId };
    if (proj.status !== PROJECT_STATUS.COMPLETED) return { ok: false, reason: '项目未完成·不可收获', code: 'not-completed' };
    if (proj.actualOutput > 0) return { ok: false, reason: '已收获·不可重复', code: 'already-collected' };

    // 实际产出 = expected × 波动 × 副作用惩罚
    var fluct = 0.7 + Math.random() * 0.6;
    var sideEffectPenalty = 1.0;
    (proj.sideEffects || []).forEach(function (se) {
      if (se && se.ecoDelta) sideEffectPenalty += se.ecoDelta / 100;
    });
    sideEffectPenalty = _clamp(sideEffectPenalty, 0.3, 1.0);
    var actualOutput = Math.round(proj.expectedOutput * fluct * sideEffectPenalty);
    proj.actualOutput = actualOutput; // arch-ok

    // 玩家分成
    var shareRatio = _clamp(proj.shareRatio || 0.4, 0, 1);
    var playerShare = Math.round(actualOutput * shareRatio);
    var localShare = actualOutput - playerShare;

    // 当地粮食增量（写入 GM.regionGrainYield·剧本可挂）
    _applyLocalGrainBoost(proj.region, localShare);

    // 玩家分成转银钱（按 grainPrice 兜底 5 两/石）
    var grainPrice = 5;
    try {
      if (typeof P !== 'undefined' && P && P.customReclaimPolicies && _isNum(P.customReclaimPolicies.grainPrice)) {
        grainPrice = P.customReclaimPolicies.grainPrice;
      }
    } catch (_) {}
    var income = playerShare * grainPrice;
    var incR = _addIncome(income, 'reclaim-harvest', '开垦产出·' + proj.region + '·' + proj.size + '·分成 ' + playerShare + ' 石');

    // 写账本
    st.stats.totalOutput += actualOutput; // arch-ok
    st.stats.totalIncome += income; // arch-ok

    _pushEvent(st, proj.id, 'harvested', 'info', '开垦收获·' + proj.region + '·实产 ' + actualOutput + ' 石·玩家分成 ' + playerShare + ' 石·折银 ' + income + ' 两', {
      actualOutput: actualOutput, playerShare: playerShare, localShare: localShare, income: income
    });

    return {
      ok: !!incR.ok,
      projectId: proj.id,
      actualOutput: actualOutput,
      playerShare: playerShare,
      localShare: localShare,
      income: income,
      cash: incR.cash,
      grainPrice: grainPrice
    };
  }

  function _applyLocalGrainBoost(region, amount) {
    if (!region || amount <= 0) return;
    try {
      if (typeof GM === 'undefined' || !GM) return;
      // 主路径：GM.regionGrainYield（剧本可挂）
      if (!GM.regionGrainYield) GM.regionGrainYield = {}; // arch-ok (区域粮食增量账本·剧本 hook 路径)
      GM.regionGrainYield[region] = (GM.regionGrainYield[region] || 0) + amount; // arch-ok
      // 备路径：GM.adminHierarchy[region].grainYield
      if (GM.adminHierarchy && GM.adminHierarchy[region]) {
        if (!_isNum(GM.adminHierarchy[region].grainYield)) GM.adminHierarchy[region].grainYield = 0; // arch-ok
        GM.adminHierarchy[region].grainYield += amount; // arch-ok
      }
    } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════
  //  §10 SubTask 23.9 "开垦副作用"·侵占 + 生态事件
  // ════════════════════════════════════════════════════════════
  //
  // triggerSideEffects(projectId, opts):
  //   - 侵占牧场/林地/猎场 → 当地势力不满（factionDelta）
  //   - 大规模开垦 → 生态事件（水患/沙化·ecoDelta）
  //   - 写入 project.sideEffects[] + events[]
  //   - 同区域多次触发同副作用会累积·返回去重提示

  function triggerSideEffects(projectId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };
    var proj = getProjectById(projectId);
    if (!proj) return { ok: false, reason: '未找到项目: ' + projectId };

    var sizeSpec = _getSizeSpec(proj.size);
    if (!sizeSpec) return { ok: false, reason: '未知规模' };

    var triggered = [];
    var policySpec = _getPolicySpec(proj.policy);
    var sideEffectCap = (policySpec && policySpec.sideEffectCap) || 'medium';

    // 侵占类副作用·按规模风险等级
    var encroachTypes = ['encroachPasture', 'encroachForest', 'encroachHunt'];
    var encroachChance = proj.size === 'large' ? 0.8 : (proj.size === 'medium' ? 0.4 : 0.1);
    if (opts.forceEncroach === true) encroachChance = 1.0;
    if (opts.forceEncroach === false) encroachChance = 0.0;

    encroachTypes.forEach(function (type) {
      if (Math.random() < encroachChance) {
        // 同区域同类型不重复触发
        var exists = (proj.sideEffects || []).some(function (se) { return se.type === type; });
        if (exists) return;
        var spec = SIDE_EFFECT_TYPES[type];
        var delta = spec.factionDelta;
        // 政策 sideEffectCap 调整：'small' 减半·'large' 加倍
        if (sideEffectCap === 'small') delta = Math.round(delta * 0.5);
        if (sideEffectCap === 'large') delta = Math.round(delta * 1.5);

        var se = {
          type: type,
          label: spec.label,
          severity: spec.severity,
          factionDelta: delta,
          turn: _turn()
        };
        if (!Array.isArray(proj.sideEffects)) proj.sideEffects = []; // arch-ok
        proj.sideEffects.push(se); // arch-ok
        _pushEvent(st, proj.id, 'side-effect:' + type, spec.severity, spec.label + '·当地势力不满 ' + delta, { type: type, factionDelta: delta });
        _applyFactionDelta(proj.region, delta);
        triggered.push(se);
      }
    });

    // 生态事件·仅大块触发
    if (proj.size === 'large' || opts.forceEco) {
      var ecoTypes = ['floodRisk', 'desertification'];
      var ecoType = ecoTypes[_rnd(0, ecoTypes.length - 1)];
      var ecoSpec = SIDE_EFFECT_TYPES[ecoType];
      var ecoExists = (proj.sideEffects || []).some(function (se) { return se.type === ecoType; });
      var ecoChance = proj.size === 'large' ? 0.3 : 0;
      if (opts.forceEco === true) ecoChance = 1.0;
      if (opts.forceEco === false) ecoChance = 0.0;
      if (!ecoExists && Math.random() < ecoChance) {
        var se2 = {
          type: ecoType,
          label: ecoSpec.label,
          severity: ecoSpec.severity,
          ecoDelta: ecoSpec.ecoDelta,
          turn: _turn()
        };
        if (!Array.isArray(proj.sideEffects)) proj.sideEffects = []; // arch-ok
        proj.sideEffects.push(se2); // arch-ok
        _pushEvent(st, proj.id, 'side-effect:' + ecoType, ecoSpec.severity, ecoSpec.label + '·生态受影响 ' + ecoSpec.ecoDelta, { type: ecoType, ecoDelta: ecoSpec.ecoDelta });
        triggered.push(se2);
      }
    }

    if (!opts.silent && triggered.length === 0) {
      _pushEvent(st, proj.id, 'side-effect:none', 'info', '未触发副作用', {});
    }

    return { ok: true, projectId: proj.id, triggered: triggered };
  }

  function _applyFactionDelta(region, delta) {
    try {
      if (typeof GM === 'undefined' || !GM) return;
      // 主路径：GM.regionFactionRelations（剧本可挂）
      if (!GM.regionFactionRelations) GM.regionFactionRelations = {}; // arch-ok (区域势力关系账本·剧本 hook 路径)
      if (!_isNum(GM.regionFactionRelations[region])) GM.regionFactionRelations[region] = 0; // arch-ok
      GM.regionFactionRelations[region] += delta; // arch-ok
    } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════
  //  §11 SubTask 23.10 "与朝廷互动"·请功 + 问责
  // ════════════════════════════════════════════════════════════
  //
  // petitionForMerit(projectId, opts):
  //   - 开垦有成可上奏请功·按 actualOutput + 玩家声望 + 皇帝关系 决定奖赏
  //   - 奖赏：银钱 + 声望 +·极端情况晋升
  //   - LLM 路径：global.callAI(prompt)·文本含"准"/"允" → 准
  //   - 缺席 LLM·规则引擎兜底
  //
  // triggerAccountability(projectId, opts):
  //   - 失败 / 违规 / 副作用爆发 → 问责
  //   - 后果：声望 -·银钱罚·极端情况罢黜

  function petitionForMerit(projectId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };
    var proj = getProjectById(projectId);
    if (!proj) return { ok: false, reason: '未找到项目: ' + projectId };
    if (proj.status !== PROJECT_STATUS.COMPLETED) return { ok: false, reason: '项目未完成·不可请功', code: 'not-completed' };
    if (proj.petitionStatus === 'approved') return { ok: false, reason: '已请功获准·不可重复', code: 'already-approved' };

    var prompt = [
      '【皇帝批奏·开垦请功】',
      '玩家奏请请功：开垦荒地·' + proj.region + '·' + (SIZES[proj.size] || {}).label,
      '实产粮食：' + (proj.actualOutput || 0) + ' 石',
      '玩家分成：' + Math.round((proj.actualOutput || 0) * (proj.shareRatio || 0.4)) + ' 石',
      '请以皇帝口吻批复是否准功（含"准"或"不"字样以判定）。'
    ].filter(Boolean).join('\n');

    var decision = _isApprovedByLLM(prompt);
    if (!decision) {
      // 规则引擎·准功概率 = 0.5 + 声望×0.003 + 皇帝关系×0.002 + 实产/1000
      var prestige = 50, sovereignRel = 50;
      try {
        if (typeof P !== 'undefined' && P && P.playerInfo) {
          if (_isNum(P.playerInfo.prestige)) prestige = P.playerInfo.prestige;
          if (_isNum(P.playerInfo.sovereignRelation)) sovereignRel = P.playerInfo.sovereignRelation;
        }
      } catch (_) {}
      var prob = 0.5 + prestige * 0.003 + sovereignRel * 0.002 + (proj.actualOutput || 0) / 1000;
      prob = _clamp(prob, 0.1, 0.95);
      decision = { adopt: Math.random() < prob, source: 'rule', prob: prob };
    }

    proj.petitionStatus = decision.adopt ? 'approved' : 'rejected'; // arch-ok

    if (decision.adopt) {
      // 奖赏：银钱 = actualOutput × 2 + 声望 +5
      var reward = Math.round((proj.actualOutput || 0) * 2);
      if (reward > 0) {
        _addIncome(reward, 'reclaim-merit', '开垦请功获准·朝廷赏银');
      }
      _applyPrestigeDelta(5, '开垦请功·朝廷嘉奖');
      _pushEvent(st, proj.id, 'merit-approved', 'info', '请功获准·朝廷赏银 ' + reward + ' 两·声望 +5', { reward: reward });
      return {
        ok: true,
        projectId: proj.id,
        approved: true,
        decision: decision,
        reward: reward,
        prestigeDelta: 5
      };
    }
    _applyPrestigeDelta(-2, '开垦请功·未准');
    _pushEvent(st, proj.id, 'merit-rejected', 'warning', '请功未准·声望 -2', {});
    return {
      ok: true,
      projectId: proj.id,
      approved: false,
      decision: decision,
      prestigeDelta: -2
    };
  }

  function triggerAccountability(projectId, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };
    var proj = getProjectById(projectId);
    if (!proj) return { ok: false, reason: '未找到项目: ' + projectId };

    // 问责原因：失败 / 违规 / 副作用爆发
    var reason = opts.reason || '开垦问责';
    var penalty = Math.round(proj.costEstimate * 0.3);
    var prestigeDelta = -8;

    // 失败项目·强制问责
    if (proj.status === PROJECT_STATUS.FAILED) {
      penalty = Math.round(proj.costEstimate * 0.5);
      prestigeDelta = -15;
    }
    // 违规项目·加重
    if (proj.status === PROJECT_STATUS.ILLEGAL || proj.permissionSource === 'illegal') {
      penalty += Math.round(proj.costEstimate * 0.3);
      prestigeDelta -= 5;
    }

    // 罚银·扣 P.playerInfo.money（如不足则记欠账）
    if (penalty > 0) {
      var spendR = _spendCash(penalty, '开垦问责·罚银');
      if (!spendR.ok) {
        // 银钱不足·转入欠账
        _pushEvent(st, proj.id, 'accountability-debt', 'critical', '问责罚银 ' + penalty + ' 两·银钱不足·转入欠账', { penalty: penalty });
      }
    }
    _applyPrestigeDelta(prestigeDelta, '开垦问责·' + reason);

    proj.accountabilityTriggered = true; // arch-ok
    _pushEvent(st, proj.id, 'accountability', 'critical', '朝廷问责·' + reason + '·罚银 ' + penalty + ' 两·声望 ' + prestigeDelta, {
      penalty: penalty, prestigeDelta: prestigeDelta, reason: reason
    });

    return {
      ok: true,
      projectId: proj.id,
      penalty: penalty,
      prestigeDelta: prestigeDelta,
      reason: reason
    };
  }

  function _applyPrestigeDelta(delta, reason) {
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (!_isNum(P.playerInfo.prestige)) P.playerInfo.prestige = 50; // arch-ok
        P.playerInfo.prestige = _clamp(P.playerInfo.prestige + delta, 0, 100); // arch-ok
      }
    } catch (_) {}
  }

  // ════════════════════════════════════════════════════════════
  //  §12 SubTask 23.11 跨朝代政策 hook·applyPolicyHook
  // ════════════════════════════════════════════════════════════
  //
  // applyPolicyHook(policyKey, opts):
  //   - 把某政策应用到当前或指定项目
  //   - 改 cost/output/shareRatio/sideEffectCap
  //   - 引擎绝不预置朝代专属政策·只识别 POLICY_TYPES 中已注册的键名
  //   - 剧本可通过 P.customReclaimPolicies.policies 扩展新政策键

  function applyPolicyHook(policyKey, opts) {
    opts = opts || {};
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    var st = _ensureState();
    if (!st) return { ok: false, reason: '账本未就绪' };
    var policySpec = _getPolicySpec(policyKey);
    if (!policySpec) return { ok: false, reason: '未知政策: ' + policyKey };

    var affected = [];
    if (opts.projectId) {
      var proj = getProjectById(opts.projectId);
      if (!proj) return { ok: false, reason: '未找到项目: ' + opts.projectId };
      _applyPolicyToProject(proj, policyKey, policySpec);
      affected.push(proj.id);
    } else {
      // 应用到所有未完成项目
      st.projects.forEach(function (p) {
        if (!p || p.status === PROJECT_STATUS.COMPLETED || p.status === PROJECT_STATUS.FAILED || p.status === PROJECT_STATUS.ABANDONED) return;
        _applyPolicyToProject(p, policyKey, policySpec);
        affected.push(p.id);
      });
    }

    _pushEvent(st, null, 'policy-applied', 'info', '政策应用·' + policySpec.label + '·影响 ' + affected.length + ' 个项目', { policy: policyKey, affected: affected });

    return {
      ok: true,
      policy: policyKey,
      label: policySpec.label,
      affected: affected
    };
  }

  function _applyPolicyToProject(proj, policyKey, policySpec) {
    proj.policy = policyKey; // arch-ok
    // 重算成本与产出（按新政策系数）
    var sizeSpec = _getSizeSpec(proj.size);
    if (sizeSpec) {
      proj.costEstimate = Math.round(sizeSpec.baseCost * policySpec.costMul * (proj.regionDifficulty || 1)); // arch-ok
      proj.expectedOutput = Math.round(sizeSpec.baseOutput * policySpec.outputMul * (proj.regionFertility || 1)); // arch-ok
      proj.monthlyCost = Math.round(proj.costEstimate / (proj.expectedTurns || 1)); // arch-ok
      proj.shareRatio = policySpec.shareRatio; // arch-ok
    }
  }

  // ════════════════════════════════════════════════════════════
  //  §13 SubTask 23.12 御案"开垦"面板
  // ════════════════════════════════════════════════════════════

  function renderPanel(targetEl) {
    var st = _ensureState();
    if (!st) return targetEl ? null : '<div class="pr-panel-empty">开垦账本未就绪</div>';

    var projects = st.projects || [];
    var events = st.events || [];
    var stats = st.stats || {};
    var inProgress = projects.filter(function (p) { return p && p.status === PROJECT_STATUS.CONSTRUCTING; });
    var completed = projects.filter(function (p) { return p && p.status === PROJECT_STATUS.COMPLETED; });
    var failed = projects.filter(function (p) { return p && (p.status === PROJECT_STATUS.FAILED || p.status === PROJECT_STATUS.ILLEGAL); });

    var h = '<div class="pr-panel" id="prPanel">';

    // ① 顶部·概览
    h += '<div class="pr-section"><div class="pr-section-title">开 垦 · 总 览</div>';
    h += '<div class="pr-row"><span>已勘探</span><span class="pr-val">' + (stats.totalSurveyed || 0) + ' 处</span></div>';
    h += '<div class="pr-row"><span>已完成 / 失败</span><span class="pr-val">' + (stats.totalCompleted || 0) + ' / ' + (stats.totalFailed || 0) + '</span></div>';
    h += '<div class="pr-row"><span>累计产粮</span><span class="pr-val">' + (stats.totalOutput || 0) + ' 石</span></div>';
    h += '<div class="pr-row"><span>累计收入</span><span class="pr-val">' + (stats.totalIncome || 0) + ' 两</span></div>';
    h += '</div>';

    // ② 在建项目
    h += '<div class="pr-section"><div class="pr-section-title">在 建 · ' + inProgress.length + '</div>';
    if (inProgress.length === 0) {
      h += '<div class="pr-empty">尚无在建项目</div>';
    } else {
      inProgress.forEach(function (p) {
        h += _renderProjectCard(p);
      });
    }
    h += '</div>';

    // ③ 已完成
    if (completed.length > 0) {
      h += '<div class="pr-section"><div class="pr-section-title">已 成 · ' + completed.length + '</div>';
      completed.forEach(function (p) {
        h += _renderProjectCard(p);
      });
      h += '</div>';
    }

    // ④ 失败/违规
    if (failed.length > 0) {
      h += '<div class="pr-section pr-warn-box"><div class="pr-section-title">失 败 / 违 规 · ' + failed.length + '</div>';
      failed.forEach(function (p) {
        h += _renderProjectCard(p);
      });
      h += '</div>';
    }

    // ⑤ 近期事件（最近 5 条）
    if (events.length > 0) {
      var recent = events.slice(-5).reverse();
      h += '<div class="pr-section"><div class="pr-section-title">近 事</div>';
      recent.forEach(function (ev) {
        h += '<div class="pr-event pr-ev-' + _esc(ev.severity) + '"><span class="pr-ev-turn">T' + ev.turn + '</span> ' + _esc(ev.message) + '</div>';
      });
      h += '</div>';
    }

    h += '</div>'; // pr-panel

    // 内嵌样式（与 tm-player-tech.js 同风格·暗金主调·朝代中立）
    h += '<style>' +
      '.pr-panel{padding:0.8rem 1rem;background:linear-gradient(90deg,rgba(22,15,8,0.84),rgba(40,28,14,0.70) 46%,rgba(15,10,6,0.82));border:1px solid rgba(215,185,104,0.30);border-radius:3px;font-family:\'STKaiti\',\'KaiTi\',\'楷体\',serif;}' +
      '.pr-panel-empty{padding:1rem;color:var(--color-foreground-muted, #999);font-style:italic;}' +
      '.pr-section{margin-bottom:0.6rem;}' +
      '.pr-section-title{color:var(--gold-400,#d7b968);letter-spacing:0.2em;font-size:1.05rem;border-bottom:1px solid rgba(215,185,104,0.30);padding-bottom:0.3rem;margin-bottom:0.4rem;}' +
      '.pr-row{display:flex;justify-content:space-between;padding:0.2rem 0.4rem;font-size:0.85rem;}' +
      '.pr-val{color:var(--gold-400,#d7b968);}' +
      '.pr-empty{padding:0.3rem 0.5rem;color:var(--color-foreground-muted,#999);font-style:italic;font-size:0.8rem;}' +
      '.pr-card{padding:0.4rem;background:rgba(0,0,0,0.25);border-radius:3px;margin-bottom:0.4rem;border-left:2px solid var(--gold-500,#b8943c);}' +
      '.pr-card-head{display:flex;justify-content:space-between;font-size:0.85rem;margin-bottom:0.2rem;}' +
      '.pr-card-region{color:var(--color-foreground,#eee);font-weight:700;}' +
      '.pr-card-status{font-size:0.75rem;color:var(--gold-400,#d7b968);}' +
      '.pr-card-meta{font-size:0.75rem;color:var(--color-foreground-muted,#999);display:flex;justify-content:space-between;flex-wrap:wrap;gap:0.3rem;}' +
      '.pr-progress{height:4px;background:rgba(0,0,0,0.4);border-radius:2px;overflow:hidden;margin-top:0.2rem;}' +
      '.pr-progress-bar{height:100%;background:linear-gradient(90deg,var(--gold-500,#b8943c),var(--gold-400,#d7b968));transition:width 0.3s;}' +
      '.pr-progress-meta{font-size:0.7rem;color:var(--color-foreground-muted,#999);margin-top:0.1rem;}' +
      '.pr-warn-box{border-left:2px solid var(--vermillion-400,#c84040);}' +
      '.pr-event{padding:0.2rem 0.4rem;font-size:0.75rem;color:var(--color-foreground-muted,#999);border-bottom:1px solid rgba(255,255,255,0.05);}' +
      '.pr-ev-turn{color:var(--gold-500,#b8943c);margin-right:0.3rem;}' +
      '.pr-ev-critical{color:var(--vermillion-400,#c84040);}' +
      '.pr-ev-warning{color:#e0a040;}' +
      '</style>';

    if (targetEl && typeof targetEl === 'object') {
      try { targetEl.innerHTML = h; return null; } catch (_) { return h; }
    }
    return h;
  }

  function _renderProjectCard(p) {
    if (!p) return '';
    var sizeSpec = SIZES[p.size] || { label: p.size };
    var stageLabel = STAGE_LABELS[p.stage] || p.stage || '';
    var statusLabel = _statusLabel(p.status);
    var h = '<div class="pr-card">';
    h += '<div class="pr-card-head">';
    h += '<span class="pr-card-region">' + _esc(p.region) + ' · ' + _esc(sizeSpec.label) + '</span>';
    h += '<span class="pr-card-status">' + _esc(statusLabel) + '</span>';
    h += '</div>';
    h += '<div class="pr-card-meta">';
    h += '<span>阶段：' + _esc(stageLabel) + '（' + (p.stageIdx + 1) + '/' + STAGES.length + '）</span>';
    h += '<span>需工：' + (p.workers || 0) + ' 人</span>';
    h += '<span>预期：' + (p.expectedOutput || 0) + ' 石</span>';
    h += '</div>';
    if (p.status === PROJECT_STATUS.CONSTRUCTING) {
      var pct = _clamp(p.progress || 0, 0, 100);
      h += '<div class="pr-progress"><div class="pr-progress-bar" style="width:' + pct + '%"></div></div>';
      h += '<div class="pr-progress-meta">进度 ' + Math.round(pct) + '% · 月支 ' + (p.monthlyCost || 0) + ' 两 · 工期 ' + (p.expectedTurns || 0) + ' 月</div>';
    }
    if (p.status === PROJECT_STATUS.COMPLETED && p.actualOutput > 0) {
      h += '<div class="pr-progress-meta">实产 ' + (p.actualOutput || 0) + ' 石 · 玩家分成 ' + Math.round((p.actualOutput || 0) * (p.shareRatio || 0)) + ' 石</div>';
    }
    if (p.permissionSource === 'illegal') {
      h += '<div class="pr-progress-meta pr-ev-critical">违规开垦</div>';
    }
    if (Array.isArray(p.sideEffects) && p.sideEffects.length > 0) {
      h += '<div class="pr-progress-meta">副作用 ' + p.sideEffects.length + ' 项·' +
           p.sideEffects.map(function (se) { return se.label || se.type; }).join('、') + '</div>';
    }
    h += '</div>';
    return h;
  }

  function _statusLabel(status) {
    var m = {
      'surveying': '勘探中',
      'pending-permit': '待许可',
      'permitted': '已许可',
      'illegal': '违规',
      'constructing': '施工中',
      'completed': '已完成',
      'failed': '失败',
      'abandoned': '已弃'
    };
    return m[status] || status;
  }

  // ════════════════════════════════════════════════════════════
  //  §14 导出命名空间
  // ════════════════════════════════════════════════════════════

  var ns = {
    // 常量
    SIZES: SIZES,
    STAGES: STAGES,
    STAGE_LABELS: STAGE_LABELS,
    PROJECT_STATUS: PROJECT_STATUS,
    POLICY_TYPES: POLICY_TYPES,
    SIDE_EFFECT_TYPES: SIDE_EFFECT_TYPES,

    // 状态查询
    getState: getState,
    getProjects: getProjects,
    getProjectById: getProjectById,
    getEvents: getEvents,
    getPolicies: getPolicies,

    // 主流程
    surveyWasteland: surveyWasteland,
    requestPermission: requestPermission,
    hasPermission: hasPermission,
    startIllegalReclaim: startIllegalReclaim,
    startConstruction: startConstruction,
    tickConstruction: tickConstruction,
    advanceStage: advanceStage,
    collectHarvest: collectHarvest,
    triggerSideEffects: triggerSideEffects,
    petitionForMerit: petitionForMerit,
    triggerAccountability: triggerAccountability,
    applyPolicyHook: applyPolicyHook,

    // 御案面板
    renderPanel: renderPanel,

    // 内部函数（smoke/调试·非游戏调用入口）
    _spendCash: _spendCash,
    _addIncome: _addIncome,
    _isTransmigration: _isTransmigration,
    _ensureState: _ensureState,
    _playerLocation: _playerLocation,
    _playerOfficialRelation: _playerOfficialRelation,
    _localOfficial: _localOfficial,
    _isApprovedByLLM: _isApprovedByLLM,
    _isApprovedByRule: _isApprovedByRule,
    _regionDifficulty: _regionDifficulty,
    _regionFertility: _regionFertility,
    _applyPolicyToProject: _applyPolicyToProject,
    _applyLocalGrainBoost: _applyLocalGrainBoost,
    _applyFactionDelta: _applyFactionDelta
  };

  global.TM.PlayerReclaim = ns;

  // 双路径挂载：浏览器走 window.TM.PlayerReclaim；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = { PlayerReclaim: ns };
    }
  } catch (_) {}
})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
