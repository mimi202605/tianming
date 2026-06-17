// @ts-check
/// <reference path="types.d.ts" />
/**
 * tm-phase-g3-edict-finalize.js — G 阶段 ③：诏令联动终结
 *
 * 补完：
 *  - 大徭役二阶段甲乙丙丁方案生成
 *  - 迁都三轮朝议递进
 *  - 诏令编辑框"参考"按钮 UI
 *  - 抗疏 12 典范案例库
 *  - 赋役滑块方案对比
 *  - 阈值常量统一
 *  - 腐败集团凝聚子系统（腐败>70）
 *  - 户口衰落信号（户口<起始×0.5）
 *  - 拒绝路径（违制）
 *  - 朝代户口典型值一键加载
 */
(function(global) {
  'use strict';

  // ═══════════════════════════════════════════════════════════════════
  //  阈值常量统一
  // ═══════════════════════════════════════════════════════════════════

  var TM_THRESHOLDS = Object.freeze({
    HUANGQUAN_POWER_MINISTER_ACTIVATE: 35,
    HUANGQUAN_ABSOLUTE_MIN: 70,
    HUANGWEI_TYRANT_ACTIVATE: 90,
    HUANGWEI_LOST_CRISIS: 30,
    HUANGWEI_MAJESTY_MIN: 70,
    MINXIN_REVOLT_HIGH_PROB: 20,
    MINXIN_ADORING_MIN: 80,
    MINXIN_PEACEFUL_MIN: 60,
    CORRUPTION_CARTEL_FORM: 70,
    CORRUPTION_DEPT_CRISIS: 65,
    POPULATION_DECLINE_CRITICAL: 0.5,  // 相对起始
    GUOKU_BANKRUPTCY: -0.5,             // 负债占年入倍数
    ANNEXATION_CRITICAL: 0.6,
    LOAD_CRITICAL: 1.25,
    PARTY_STRIFE_CHAOS: 70
  });

  // ═══════════════════════════════════════════════════════════════════
  //  大徭役二阶段甲乙丙丁方案
  // ═══════════════════════════════════════════════════════════════════

  var CORVEE_ABCD_VARIANTS = {
    A: {
      code: '甲',
      name: '钦差督办',
      description: '钦差大臣亲督，限期半载',
      durationMult: 0.5,
      costMult: 1.5,
      deathRateMult: 1.2,
      moraleCostMult: 1.3,
      hwDeltaOnComplete: 8,
      minxinDelta: -5,
      note: '快而苦'
    },
    B: {
      code: '乙',
      name: '按期营造',
      description: '工部按期分段施工',
      durationMult: 1.0,
      costMult: 1.0,
      deathRateMult: 1.0,
      moraleCostMult: 1.0,
      hwDeltaOnComplete: 5,
      minxinDelta: -2,
      note: '中庸'
    },
    C: {
      code: '丙',
      name: '分期缓办',
      description: '三年成之，分段休役',
      durationMult: 1.5,
      costMult: 0.8,
      deathRateMult: 0.6,
      moraleCostMult: 0.5,
      hwDeltaOnComplete: 3,
      minxinDelta: 0,
      note: '稳而久'
    },
    D: {
      code: '丁',
      name: '招募雇役',
      description: '以银代役，招工给饷',
      durationMult: 1.2,
      costMult: 2.0,
      deathRateMult: 0.3,
      moraleCostMult: 0.2,
      hwDeltaOnComplete: 6,
      minxinDelta: +3,
      note: '费银而轻民'
    }
  };

  function generateCorveeABCDOptions(baseSpec) {
    var options = {};
    Object.keys(CORVEE_ABCD_VARIANTS).forEach(function(k) {
      var v = CORVEE_ABCD_VARIANTS[k];
      options[k] = {
        code: v.code,
        name: v.name,
        description: v.description,
        note: v.note,
        estimatedDuration: Math.round((baseSpec.duration || 24) * v.durationMult) + ' 月',
        estimatedCost: Math.round((baseSpec.cost || 500000) * v.costMult),
        estimatedDeathRate: ((baseSpec.baseRate || 0.05) * v.deathRateMult * 100).toFixed(1) + '%',
        estimatedMinxinDelta: v.minxinDelta,
        estimatedHwDelta: v.hwDeltaOnComplete
      };
    });
    return options;
  }

  function openCorveeABCDPanel(baseSpec) {
    var opts = generateCorveeABCDOptions(baseSpec);
    var body = '<div style="max-width:720px;font-family:inherit;">';
    body += '<div style="font-size:1.0rem;color:var(--gold-300);margin-bottom:0.4rem;">⚒ 大徭役议方</div>';
    body += '<div style="font-size:0.78rem;color:var(--ink-300);margin-bottom:8px;">欲行 <b>' + (baseSpec.name || '某工程') + '</b>，工部议陈四方可由陛下钦裁：</div>';
    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
    Object.keys(opts).forEach(function(k) {
      var o = opts[k];
      body += '<div style="padding:10px;background:var(--bg-2);border-left:3px solid var(--gold-400);border-radius:4px;">';
      body += '<div style="font-size:0.86rem;color:var(--gold-300);"><b>' + o.code + '：' + o.name + '</b></div>';
      body += '<div style="font-size:0.72rem;color:var(--ink-300);margin-top:4px;">' + o.description + '</div>';
      body += '<div style="font-size:0.7rem;margin-top:6px;color:#d4be7a;">';
      body += '期 ' + o.estimatedDuration + ' · 费 ' + o.estimatedCost + ' 钱<br>';
      body += '死 ' + o.estimatedDeathRate + ' · 民心 ' + (o.estimatedMinxinDelta >= 0 ? '+' : '') + o.estimatedMinxinDelta + '<br>';
      body += '皇威 +' + o.estimatedHwDelta;
      body += '</div>';
      body += '<button class="btn" style="margin-top:6px;font-size:0.72rem;padding:4px 10px;" onclick="PhaseG3._selectCorveeVariant(\'' + k + '\',' + JSON.stringify(baseSpec).replace(/"/g,'&quot;') + ')">选此方</button>';
      body += '</div>';
    });
    body += '</div>';
    body += '</div>';
    var ov = document.createElement('div');
    ov.className = '_g3_modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:19050;display:flex;align-items:center;justify-content:center;';
    ov.innerHTML = '<div style="background:var(--bg-1);border:1px solid var(--gold);border-radius:6px;padding:1.0rem;width:92%;max-width:750px;">' + body + '<button class="btn" style="margin-top:0.6rem;" onclick="this.parentNode.parentNode.remove()">搁置</button></div>';
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  function selectCorveeVariant(variantKey, baseSpec) {
    var variant = CORVEE_ABCD_VARIANTS[variantKey];
    if (!variant) return;
    var finalSpec = Object.assign({}, baseSpec, {
      durationTurns: Math.round((baseSpec.duration || 24) * variant.durationMult),
      costApplied: Math.round((baseSpec.cost || 500000) * variant.costMult),
      baseRate: (baseSpec.baseRate || 0.05) * variant.deathRateMult,
      _variant: variantKey,
      _variantName: variant.name
    });
    if (typeof global.PhaseG2 !== 'undefined' && global.PhaseG2.startCorveeProject) {
      global.PhaseG2.startCorveeProject(finalSpec);
    }
    document.querySelectorAll('._g3_modal').forEach(function(o){o.remove();});
    if (global.toast) global.toast('已选 ' + variant.name);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  迁都三轮朝议递进
  // ═══════════════════════════════════════════════════════════════════

  function initiateMovCapitalThreeRound(initialInput) {
    var G = global.GM;
    if (!G._movCapitalProcess) G._movCapitalProcess = [];
    var proc = {
      id: 'movcap_' + (G.turn||0) + '_' + Math.floor(Math.random()*10000),
      startTurn: G.turn || 0,
      round: 1,
      rounds: [
        { round: 1, question: '是否迁都', resolution: null, description: '讨论是否有必要迁都' },
        { round: 2, question: '迁何处', resolution: null, candidates: ['长安','洛阳','开封','南京','北京'] },
        { round: 3, question: '迁都方案', resolution: null, description: '期限/费用/分批等' }
      ],
      status: 'active'
    };
    G._movCapitalProcess.push(proc);
    openMovCapRoundUI(proc.id, 1);
    return proc;
  }

  function openMovCapRoundUI(procId, round) {
    var G = global.GM;
    var proc = (G._movCapitalProcess || []).find(function(p){return p.id===procId;});
    if (!proc) return;
    var r = proc.rounds[round - 1];
    if (!r) return;
    var body = '<div style="max-width:540px;font-family:inherit;">';
    body += '<div style="font-size:1.0rem;color:var(--gold-300);margin-bottom:0.4rem;">🏯 迁都廷议 · 第 ' + round + ' 轮</div>';
    body += '<div style="font-size:0.82rem;color:var(--ink-300);margin-bottom:8px;"><b>' + r.question + '</b></div>';
    if (round === 1) {
      body += '<button class="btn" style="margin:4px;" onclick="PhaseG3._resolveMovCapRound(\''+procId+'\',1,\'proceed\')">宜迁</button>';
      body += '<button class="btn" style="margin:4px;" onclick="PhaseG3._resolveMovCapRound(\''+procId+'\',1,\'cancel\')">不迁</button>';
    } else if (round === 2) {
      r.candidates.forEach(function(c) {
        body += '<button class="btn" style="margin:4px;" onclick="PhaseG3._resolveMovCapRound(\''+procId+'\',2,\''+c+'\')">' + c + '</button>';
      });
    } else if (round === 3) {
      body += '<div style="margin:8px 0;"><label>期限（年）：<input id="_mc_years" type="number" value="5" style="width:80px;"></label></div>';
      body += '<div style="margin:8px 0;"><label>预算（万钱）：<input id="_mc_budget" type="number" value="1000" style="width:100px;"></label></div>';
      body += '<button class="btn" onclick="PhaseG3._resolveMovCapRound(\''+procId+'\',3,{years:+document.getElementById(\'_mc_years\').value,budget:+document.getElementById(\'_mc_budget\').value})">定案签发</button>';
    }
    body += '</div>';
    var ov = document.createElement('div');
    ov.className = '_g3_mc_modal';
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:19055;display:flex;align-items:center;justify-content:center;';
    ov.innerHTML = '<div style="background:var(--bg-1);border:1px solid var(--gold);border-radius:6px;padding:1.0rem;width:92%;max-width:560px;">' + body + '</div>';
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  function resolveMovCapRound(procId, round, payload) {
    var G = global.GM;
    var proc = (G._movCapitalProcess || []).find(function(p){return p.id===procId;});
    if (!proc) return;
    proc.rounds[round - 1].resolution = payload;
    document.querySelectorAll('._g3_mc_modal').forEach(function(o){o.remove();});
    if (round === 1 && payload === 'cancel') {
      proc.status = 'cancelled';
      if (global.addEB) global.addEB('廷议', '迁都议罢');
      return;
    }
    if (round < 3) {
      proc.round = round + 1;
      setTimeout(function(){ openMovCapRoundUI(procId, round + 1); }, 300);
    } else {
      proc.status = 'resolved';
      // 执行迁都
      var newCap = proc.rounds[1].resolution;
      if (typeof global.EdictComplete !== 'undefined' && global.EdictComplete.P1_EDICT_TYPES) {
        global.EdictComplete.P1_EDICT_TYPES.move_capital.aiEntry({ newCapital: newCap, timeline: payload.years });
      }
      if (G.guoku && payload.budget) G.guoku.money = Math.max(0, G.guoku.money - payload.budget * 10000);
      if (global.addEB) global.addEB('迁都', '三轮廷议定：迁 ' + newCap + '，限 ' + payload.years + ' 年');
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  抗疏 12 典范案例库
  // ═══════════════════════════════════════════════════════════════════

  var ABDUCTION_12_CASES = [
    { id:'hai_rui',      name:'海瑞抗嘉靖',   year:1566, dynasty:'明', trigger:/修道|斋醮|方士/, arguments:['国用已竭','天下困穷','非求永寿道'], outcome:'hailed', description:'买棺抬回家' },
    { id:'fang_xiaoru',  name:'方孝孺抗朱棣', year:1402, dynasty:'明', trigger:/改元|正统/, arguments:['名分大义','祖训成宪'], outcome:'executed_10_clans', description:'拒草即位诏被灭十族' },
    { id:'yang_zhenghe', name:'杨廷和大礼议', year:1521, dynasty:'明', trigger:/大礼|祧|考/, arguments:['宗法祖制','正统继嗣'], outcome:'集体离朝' },
    { id:'liu_zongzhou', name:'刘宗周抗魏忠贤',year:1623,dynasty:'明', trigger:/阉党|魏珰/, arguments:['阉党祸国','东林受害'], outcome:'removed' },
    { id:'fan_zhongyan', name:'范仲淹谏吕夷简',year:1036,dynasty:'宋', trigger:/用人|请托/, arguments:['朋党浩然','朝有正气'], outcome:'demoted' },
    { id:'wei_zheng',    name:'魏征谏太宗',   year:628,  dynasty:'唐', trigger:/.*/, arguments:['兼听则明','水能载舟'], outcome:'hailed_model',    description:'直言 300 谏' },
    { id:'zhang_zhi_dong',name:'张之洞抗张之万',year:1894,dynasty:'清',trigger:/割台|辽东/,   arguments:['国土社稷'], outcome:'mixed' },
    { id:'liu_guangdi',  name:'戊戌六君子',   year:1898, dynasty:'清', trigger:/变法|废|守旧/, arguments:['变法图强','民族危亡'], outcome:'executed' },
    { id:'kou_zhun',     name:'寇准谏澶渊',   year:1004, dynasty:'宋', trigger:/南迁|和议/,    arguments:['不可南迁','御驾亲征'], outcome:'hailed' },
    { id:'bi_gan',       name:'比干剖心',     year:-1046,dynasty:'商', trigger:/纣王/,         arguments:['祖宗之法','民不可伤'], outcome:'executed',        description:'剖比干之心' },
    { id:'zhu_yunwen_li',name:'黄子澄齐泰',   year:1399, dynasty:'明', trigger:/削藩/,         arguments:['宗亲之患','尾大不掉'], outcome:'later_killed' },
    { id:'zuo_guangdou', name:'左光斗抗魏忠贤',year:1625,dynasty:'明', trigger:/阉党/,         arguments:['正气不灭','公道人心'], outcome:'imprisoned_died' }
  ];

  function findRelevantAbductionCases(decreeText) {
    return ABDUCTION_12_CASES.filter(function(c) {
      return c.trigger.test(decreeText);
    }).slice(0, 3);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  赋役滑块方案对比
  // ═══════════════════════════════════════════════════════════════════

  var FUYI_SCHEME_ABCD = {
    A: { name:'甲·紧',  taxAdjust:+0.20, corveeMonths:3, description:'以足岁出',       minxinDelta:-10, treasuryDelta:+0.30 },
    B: { name:'乙·常',  taxAdjust: 0.00, corveeMonths:1, description:'因袭前年',       minxinDelta: 0,  treasuryDelta: 0 },
    C: { name:'丙·宽',  taxAdjust:-0.10, corveeMonths:1, description:'与民休息',       minxinDelta:+5,  treasuryDelta:-0.10 },
    D: { name:'丁·恩',  taxAdjust:-0.30, corveeMonths:0, description:'大赦蠲免',       minxinDelta:+12, treasuryDelta:-0.30 }
  };

  function openFuyiSchemeComparison() {
    var body = '<div style="max-width:680px;font-family:inherit;">';
    body += '<div style="font-size:1.0rem;color:var(--gold-300);margin-bottom:0.4rem;">📜 年度赋役 · 四方对比</div>';
    body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;">';
    Object.keys(FUYI_SCHEME_ABCD).forEach(function(k) {
      var v = FUYI_SCHEME_ABCD[k];
      body += '<div style="padding:10px;background:var(--bg-2);border-radius:4px;">';
      body += '<div style="font-size:0.86rem;color:var(--gold-300);">' + v.name + '</div>';
      body += '<div style="font-size:0.74rem;color:var(--ink-300);margin-top:4px;">' + v.description + '</div>';
      body += '<div style="font-size:0.7rem;margin-top:6px;">';
      body += '田赋 ' + (v.taxAdjust>=0?'+':'') + (v.taxAdjust*100).toFixed(0) + '%<br>';
      body += '徭役 ' + v.corveeMonths + ' 月<br>';
      body += '民心 ' + (v.minxinDelta>=0?'+':'') + v.minxinDelta + '<br>';
      body += '帑廪 ' + (v.treasuryDelta>=0?'+':'') + (v.treasuryDelta*100).toFixed(0) + '%';
      body += '</div>';
      body += '<button class="btn" style="margin-top:6px;font-size:0.72rem;padding:4px 10px;" onclick="PhaseG3._applyFuyiScheme(\''+k+'\')">选此方</button>';
      body += '</div>';
    });
    body += '</div>';
    // 含滑块（自定义）
    body += '<div style="margin-top:12px;padding:8px;background:var(--bg-2);border-radius:4px;">';
    body += '<div style="font-size:0.78rem;color:var(--gold-400);">自定（戊）</div>';
    body += '<button class="btn" style="margin-top:4px;font-size:0.72rem;" onclick="openAnnualFuyiPanel();this.parentNode.parentNode.parentNode.remove();">用滑块自定</button>';
    body += '</div>';
    body += '</div>';
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:19060;display:flex;align-items:center;justify-content:center;';
    ov.innerHTML = '<div style="background:var(--bg-1);border:1px solid var(--gold);border-radius:6px;padding:1.0rem;width:92%;max-width:700px;max-height:88vh;overflow-y:auto;">' + body + '<button class="btn" style="margin-top:0.6rem;" onclick="this.parentNode.parentNode.remove()">关闭</button></div>';
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  function applyFuyiScheme(key) {
    var v = FUYI_SCHEME_ABCD[key];
    if (!v) return;
    var G = global.GM;
    if (!G.fiscalConfig) G.fiscalConfig = {};
    G.fiscalConfig.annualFuyi = { taxRateAdjust: v.taxAdjust, corveeMonths: v.corveeMonths, scheme: key, approvedTurn: G.turn };
    if (G.guoku) {
      var delta = Math.floor((G.guoku.annualIncome || 10000000) * v.treasuryDelta);
      G.guoku._annualFuyiAdjust = delta;
    }
    if (global._adjAuthority && v.minxinDelta) global._adjAuthority('minxin', v.minxinDelta);
    if (global.addEB) global.addEB('赋役', '本年方案 ' + v.name);
    document.querySelectorAll('div[style*="z-index:19060"]').forEach(function(o){o.remove();});
    if (global.toast) global.toast('已行 ' + v.name);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  腐败集团凝聚子系统
  // ═══════════════════════════════════════════════════════════════════

  function _tickCorruptionCartel(ctx, mr) {
    var G = global.GM;
    if (!G.corruption) return;
    var overall = (typeof G.corruption === 'object')
      ? (typeof G.corruption.trueIndex === 'number' ? G.corruption.trueIndex : G.corruption.overall)
      : G.corruption;
    if (overall < TM_THRESHOLDS.CORRUPTION_CARTEL_FORM) {
      if (G._corruptionCartel) delete G._corruptionCartel;
      return;
    }
    if (!G._corruptionCartel) {
      G._corruptionCartel = {
        formed: true,
        formedTurn: G.turn || 0,
        cohesion: 0.3,
        members: [],
        resistance: 0.2
      };
      if (global.addEB) global.addEB('腐败', '官僚集团结党自保，反腐将愈艰');
    }
    var cartel = G._corruptionCartel;
    cartel.cohesion = Math.min(1, cartel.cohesion + 0.01 * mr);
    cartel.resistance = Math.min(0.9, cartel.resistance + 0.005 * mr);
    // 吸纳高腐败官员
    (G.chars || []).forEach(function(c) {
      if (c.alive === false) return;
      if ((c.integrity || 60) < 30 && cartel.members.indexOf(c.name) < 0 && cartel.members.length < 20) {
        cartel.members.push(c.name);
      }
    });
    // 集团效应：反腐效率降
    if (G.auditSystem && cartel.resistance > 0.5) {
      G.auditSystem.strength = Math.max(0.1, G.auditSystem.strength * (1 - cartel.resistance * 0.3));
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  户口衰落信号
  // ═══════════════════════════════════════════════════════════════════

  function _checkPopulationDecline(ctx) {
    var G = global.GM;
    if (!G.population || !G.population.national) return;
    if (!G._initialPopulation) {
      G._initialPopulation = { mouths: G.population.national.mouths || 50000000, turn: G.turn || 0 };
      return;
    }
    var ratio = (G.population.national.mouths || 0) / G._initialPopulation.mouths;
    if (ratio < TM_THRESHOLDS.POPULATION_DECLINE_CRITICAL && !G._populationDeclineSignalFired) {
      G._populationDeclineSignalFired = true;
      if (global.addEB) global.addEB('户口', '天下口数较始锐减过半，衰亡之兆');
      if (typeof global.EventBus !== 'undefined') {
        global.EventBus.emit('population.decline.critical', { ratio: ratio, turn: ctx.turn });
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  拒绝路径（违制）
  // ═══════════════════════════════════════════════════════════════════

  var VIOLATION_PATTERNS = [
    { re:/杀妇孺|坑婴儿/,        reason:'逆天害理' },
    { re:/废除科举.*世袭|封建诸子/,reason:'违祖训' },
    { re:/改元.*反正朔/,          reason:'紊正朔' },
    { re:/废皇后立妃/,             reason:'紊纲常' }
  ];

  function checkDecreeViolation(text) {
    for (var i = 0; i < VIOLATION_PATTERNS.length; i++) {
      if (VIOLATION_PATTERNS[i].re.test(text)) {
        return { violated: true, reason: VIOLATION_PATTERNS[i].reason };
      }
    }
    return { violated: false };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  朝代户口典型值一键加载
  // ═══════════════════════════════════════════════════════════════════

  var DYNASTY_POPULATION_PRESETS = {
    '秦':   { households: 10000000, mouths: 40000000, ding: 15000000 },
    '汉':   { households: 12230000, mouths: 59590000, ding: 20000000 },
    '唐':   { households: 9069100,  mouths: 52880000, ding: 18000000 },
    '宋':   { households: 20000000, mouths: 100000000,ding: 30000000 },
    '元':   { households: 13000000, mouths: 60000000, ding: 20000000 },
    '明':   { households: 10700000, mouths: 60000000, ding: 20000000 },
    '清':   { households: 55000000, mouths: 300000000,ding: 100000000 }
  };

  function applyDynastyPopulationPreset(dynasty) {
    var preset = DYNASTY_POPULATION_PRESETS[dynasty];
    if (!preset) return { ok: false };
    var G = global.GM;
    if (!G.population) return { ok: false };
    G.population.national = Object.assign({}, G.population.national, preset);
    if (global.addEB) global.addEB('户口', '按 ' + dynasty + ' 朝代预设加载');
    return { ok: true, preset: preset };
  }

  // ═══════════════════════════════════════════════════════════════════
  //  诏令参考按钮（挂到诏令编辑区）
  // ═══════════════════════════════════════════════════════════════════

  function attachEdictReferenceButton() {
    // 等 DOM 就绪后挂载
    if (typeof document === 'undefined') return;
    var tries = 0;
    var timer = setInterval(function() {
      tries++;
      if (tries > 20) { clearInterval(timer); return; }
      // 找诏令编辑区（可能 id 为 edict-editor 或 textarea）
      var textareas = document.querySelectorAll('textarea');
      textareas.forEach(function(ta) {
        if (ta._refBtnAttached) return;
        if ((ta.placeholder || '').match(/诏|圣旨|圣谕|下诏/)) {
          var btn = document.createElement('button');
          btn.textContent = '📚 速查';
          btn.className = 'btn';
          btn.style.cssText = 'position:absolute;font-size:0.72rem;padding:3px 8px;';
          btn.onclick = function(e) { e.preventDefault(); if (global.openEdictReferenceBar) global.openEdictReferenceBar(); };
          ta.parentNode.style.position = 'relative';
          btn.style.bottom = '4px';
          btn.style.right = '4px';
          ta.parentNode.appendChild(btn);
          ta._refBtnAttached = true;
        }
      });
    }, 500);
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Tick + Init
  // ═══════════════════════════════════════════════════════════════════

  function tick(ctx) {
    ctx = ctx || {};
    var mr = ctx.monthRatio || 1;
    try { _tickCorruptionCartel(ctx, mr); } catch(e){try{window.TM&&TM.errors&&TM.errors.captureSilent(e,'tm-edict-thresholds');}catch(_){}}
    try { _checkPopulationDecline(ctx); } catch(e){try{window.TM&&TM.errors&&TM.errors.captureSilent(e,'tm-edict-thresholds');}catch(_){}}
  }

  function init() {
    setTimeout(attachEdictReferenceButton, 2000);
  }

  global.PhaseG3 = {
    init: init,
    tick: tick,
    TM_THRESHOLDS: TM_THRESHOLDS,
    CORVEE_ABCD_VARIANTS: CORVEE_ABCD_VARIANTS,
    generateCorveeABCDOptions: generateCorveeABCDOptions,
    openCorveeABCDPanel: openCorveeABCDPanel,
    _selectCorveeVariant: selectCorveeVariant,
    initiateMovCapitalThreeRound: initiateMovCapitalThreeRound,
    _resolveMovCapRound: resolveMovCapRound,
    ABDUCTION_12_CASES: ABDUCTION_12_CASES,
    findRelevantAbductionCases: findRelevantAbductionCases,
    FUYI_SCHEME_ABCD: FUYI_SCHEME_ABCD,
    openFuyiSchemeComparison: openFuyiSchemeComparison,
    _applyFuyiScheme: applyFuyiScheme,
    checkDecreeViolation: checkDecreeViolation,
    DYNASTY_POPULATION_PRESETS: DYNASTY_POPULATION_PRESETS,
    applyDynastyPopulationPreset: applyDynastyPopulationPreset,
    attachEdictReferenceButton: attachEdictReferenceButton,
    VERSION: 1
  };

  global.TM_THRESHOLDS = TM_THRESHOLDS;
  global.openFuyiSchemeComparison = openFuyiSchemeComparison;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
