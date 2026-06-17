/**
 * tm-keju-allocation.js
 * v7.1·Slice E3·朝代联动选官分配·走 keyi topicType='allocation'
 *
 * 朝代联动·
 *   明清·一甲直翰林 (修撰/编修/编修)·二甲选庶吉士入翰林·三甲外放县令
 *   唐·进士+吏部释褐试二阶段 (stub·标 note='需吏部释褐试')
 *   宋·状元直授制诰·三甲县令外放
 *   元·四等人差额·蒙古/色目入翰林·汉人/南人外放
 *   其他朝代·fallback 宋模型 (3-tier 现/直授·实用)
 *
 * Public API (window 暴露)·
 *   _kjAllocationKeyiCallback(method, opts)             — B3 keyi dispatch 调
 *   _kjDispatchAllocationByDynasty(grads, dynasty)      — 朝代 dispatch
 *   _kjApplyAllocations(allocations, exam)              — 写回 GM.chars
 *   _kjAllocate{MingQing,Tang,Song,Yuan}(grads)         — 朝代 specific
 *
 * 限制·
 *   仅 keju.system='kj' 朝代生效·汉/魏晋 backlog (system='chaju'/'jpzz')
 *
 * red line·
 *   #11·复用 council/edict/defy 三 tier 代价 (调 _adjustHuangwei/_adjustMinxin)·不发明新代价
 *   不动 _kejuAutoAssign / _kejuAllocateGradsToOffices 主体·仅加朝代 dispatch 层
 */
(function() {
  'use strict';

  /**
   * _kjDispatchAllocationByDynasty(grads, dynasty)
   * 按朝代分配·grads = [{name, rank, ethnicity?, ...}]
   * 返 [{name, rank, dept, officialTitle, allocation, note?}]
   */
  function _kjDispatchAllocationByDynasty(grads, dynasty) {
    if (!grads || !grads.length) return [];
    if (!dynasty) {
      try {
        if (typeof P !== 'undefined' && P) dynasty = P.dynasty || P.era || '';
      } catch (_) { dynasty = ''; }
    }
    dynasty = String(dynasty || '');

    // 朝代 dispatch·明清→明清·唐→唐·元→元·宋/辽/金/其他→宋 (fallback)
    if (/明|清/.test(dynasty)) return _kjAllocateMingQing(grads);
    if (/唐/.test(dynasty)) return _kjAllocateTang(grads);
    if (/元/.test(dynasty)) return _kjAllocateYuan(grads);
    if (/宋|辽|金/.test(dynasty)) return _kjAllocateSong(grads);
    // fallback·宋模型
    return _kjAllocateSong(grads);
  }

  /** 明清·一甲直翰林 / 二甲庶吉士 / 三甲外放 */
  function _kjAllocateMingQing(grads) {
    return grads.map(function(g, i) {
      var rank = g.rank || (i + 1);
      var dept, title;
      if (rank === 1) {
        dept = '翰林院';
        title = '修撰 (从六品)';
      } else if (rank === 2 || rank === 3) {
        dept = '翰林院';
        title = '编修 (正七品)';
      } else if (rank <= 20) {
        dept = '翰林院';
        title = '庶吉士';
      } else {
        dept = '地方';
        title = '知县 (正七品)';
      }
      return { name: g.name, rank: rank, dept: dept, officialTitle: title, allocation: 'mingqing' };
    });
  }

  /** 唐·二阶段·进士及第后入吏部释褐试·此处 stub 直授 / 标待选 */
  function _kjAllocateTang(grads) {
    return grads.map(function(g, i) {
      var rank = g.rank || (i + 1);
      var dept, title, note;
      if (rank === 1) {
        dept = '中书省';
        title = '校书郎';
      } else if (rank <= 5) {
        dept = '门下省';
        title = '校书郎';
      } else {
        dept = '吏部';
        title = '释褐待选 (二阶段)';
        note = '需吏部释褐试';
      }
      var o = { name: g.name, rank: rank, dept: dept, officialTitle: title, allocation: 'tang' };
      if (note) o.note = note;
      return o;
    });
  }

  /** 宋·状元直授制诰 / 三甲县令 (亦作 fallback) */
  function _kjAllocateSong(grads) {
    return grads.map(function(g, i) {
      var rank = g.rank || (i + 1);
      var dept, title;
      if (rank === 1) {
        dept = '中书省';
        title = '知制诰';
      } else if (rank <= 3) {
        dept = '中书省';
        title = '中书舍人';
      } else if (rank <= 10) {
        dept = '中央';
        title = '通判';
      } else {
        dept = '地方';
        title = '知县';
      }
      return { name: g.name, rank: rank, dept: dept, officialTitle: title, allocation: 'song' };
    });
  }

  /** 元·四等人差额·蒙古/色目入翰林·汉人/南人外放 */
  function _kjAllocateYuan(grads) {
    return grads.map(function(g, i) {
      var rank = g.rank || (i + 1);
      var ethnicity = g.ethnicity || '汉';
      var dept, title;
      if (/蒙古|色目/.test(ethnicity)) {
        dept = '翰林院';
        title = '应奉翰林文字';
      } else {
        dept = '地方';
        title = '县丞';
      }
      return {
        name: g.name, rank: rank, dept: dept, officialTitle: title,
        allocation: 'yuan',
        note: '四等差额·' + ethnicity
      };
    });
  }

  /**
   * _kjApplyAllocations(allocations, exam)
   * 把分配结果写入 GM.chars (找对应 ch·设 officialTitle / dept / _allocationType)
   * 返 applied 数 (实际写入的 ch 数)
   */
  function _kjApplyAllocations(allocations, exam) {
    if (!allocations || !allocations.length) return 0;
    if (typeof GM === 'undefined' || !GM || !GM.chars) return 0;
    var applied = 0;
    allocations.forEach(function(alloc) {
      var ch = GM.chars.find(function(c) { return c && c.name === alloc.name; });
      if (!ch) return;
      ch.officialTitle = alloc.officialTitle;
      if (alloc.dept) ch.dept = alloc.dept;
      // 科举按名次注入初始功名(状元>榜眼>探花>二甲>三甲)·入仕的功名来源·标已迁移防被 derive 覆盖
      try { if (window.TMPromotion) { if (!ch.resources) ch.resources = {}; var _rk = alloc.rank || 99; var _place = _rk === 1 ? 'zhuangyuan' : _rk === 2 ? 'bangyan' : _rk === 3 ? 'tanhua' : (_rk <= 20 ? 'jinshi_2' : 'jinshi_3'); var _grant = TMPromotion.kejuGrant(_place); ch.resources.virtueMerit = Math.max(ch.resources.virtueMerit || 0, _grant); ch.resources.virtueStage = TMPromotion.stageForMerit(ch.resources.virtueMerit); ch.resources._meritScale = TMPromotion.SCALE; } } catch (_kjvmE) {}
      // 科举盖结构化出身(进士·一甲直授翰林荣衔→清流储相)·入仕的功名资格来源
      try { if (window.TMGongming) { var _gmRk = alloc.rank || 99; var _gmHonors = _gmRk === 1 ? ['状元', '翰林'] : _gmRk === 2 ? ['榜眼', '翰林'] : _gmRk === 3 ? ['探花', '翰林'] : []; TMGongming.grant(ch, { path: 'keju', tier: '进士', honors: _gmHonors, source: 'keju', turn: (typeof GM !== 'undefined' && GM) ? GM.turn : 0 }); } } catch (_kjgmE) {}
      ch._allocationType = alloc.allocation;
      if (alloc.note) ch._allocationNote = alloc.note;
      applied++;
    });
    try {
      if (typeof addEB === 'function' && applied > 0) {
        var atype = (allocations[0] && allocations[0].allocation) || 'unknown';
        addEB('科举', '授官分配·' + applied + ' 人·' + atype);
      }
    } catch (_) {}
    return applied;
  }

  /**
   * _kjAllocationKeyiCallback(method, opts)
   * B3 dispatch 自动调·议政通过后跑分配
   *   method='council'·零代价 (议得过)
   *   method='edict'·皇威 -5 (强推)
   *   method='defy'·皇威 -10 + 民心 -3 (逆议)
   */
  function _kjAllocationKeyiCallback(method, opts) {
    var exam = null;
    try { exam = (typeof P !== 'undefined' && P.keju) ? P.keju.currentExam : null; } catch (_) {}
    if (!exam) {
      console.warn('[E3] allocation callback 缺 currentExam·skip');
      return null;
    }

    var dynasty = '';
    try {
      if (typeof P !== 'undefined' && P) dynasty = P.dynasty || P.era || '';
    } catch (_) {}

    var system = 'kj';
    try {
      if (typeof P !== 'undefined' && P.keju && P.keju.system) system = P.keju.system;
      else if (exam && exam.system) system = exam.system;
    } catch (_) {}

    // 仅 kj 朝代生效·汉 chaju / 魏晋 jpzz backlog
    if (system !== 'kj') {
      try { if (typeof toast === 'function') toast('当前朝代非科举制·跳过授官分配 (' + system + ')'); } catch (_) {}
      return null;
    }

    var grads = (exam.dianshiResults || []).slice(0, 20);
    if (!grads.length) {
      console.warn('[E3] 无 dianshiResults·skip');
      return null;
    }

    var allocations = _kjDispatchAllocationByDynasty(grads, dynasty);

    // council/edict/defy 三 tier 代价 (red line #11·复用现有 tier·不发明新代价)
    try {
      if (method === 'edict') {
        if (typeof _adjustHuangwei === 'function') _adjustHuangwei(-5, '强推选官·吏部不悦');
        if (typeof addEB === 'function') addEB('科举', '强推选官·huangwei-5');
      } else if (method === 'defy') {
        if (typeof _adjustHuangwei === 'function') _adjustHuangwei(-10, '逆议强推选官·吏部抗议');
        if (typeof _adjustMinxin === 'function') _adjustMinxin(-3, '逆议强推选官·士林侧目');
        if (typeof addEB === 'function') addEB('科举', '逆议强推选官·重惩');
      }
      // method='council'·零代价
    } catch (_) {}

    var applied = _kjApplyAllocations(allocations, exam);

    try {
      if (typeof toast === 'function') toast('授官分配·' + allocations.length + ' 人·朝代·' + (dynasty || '未知'));
    } catch (_) {}

    return { allocations: allocations, applied: applied, method: method, dynasty: dynasty };
  }

  // ───── window expose ─────
  if (typeof window !== 'undefined') {
    window._kjAllocationKeyiCallback = _kjAllocationKeyiCallback;
    window._kjDispatchAllocationByDynasty = _kjDispatchAllocationByDynasty;
    window._kjApplyAllocations = _kjApplyAllocations;
    window._kjAllocateMingQing = _kjAllocateMingQing;
    window._kjAllocateTang = _kjAllocateTang;
    window._kjAllocateSong = _kjAllocateSong;
    window._kjAllocateYuan = _kjAllocateYuan;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjAllocationKeyiCallback: _kjAllocationKeyiCallback,
      _kjDispatchAllocationByDynasty: _kjDispatchAllocationByDynasty,
      _kjApplyAllocations: _kjApplyAllocations,
      _kjAllocateMingQing: _kjAllocateMingQing,
      _kjAllocateTang: _kjAllocateTang,
      _kjAllocateSong: _kjAllocateSong,
      _kjAllocateYuan: _kjAllocateYuan
    };
  }
})();
