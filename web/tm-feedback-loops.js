// @ts-check
/// <reference path="types.d.ts" />
/**
 * tm-phase-e-patches.js — E 阶段正反馈回路 + UI 残项
 *
 * 补完：
 *  E1 明君回路 + 末世崩溃链 + 腐败×皇威×帑廪漏损三角 + 民心↔皇权倒U曲线
 *  E2 年度赋役总纲滑块 UI + editor-ai-gen 引用 EDICT_TEMPLATES + 联动顺序调整
 */
(function(global) {
  'use strict';

  function _corruptionIndex(G, fallback) {
    var c = G && G.corruption;
    if (typeof c === 'number' && isFinite(c)) return c;
    if (!c || typeof c !== 'object') return fallback;
    if (typeof c.trueIndex === 'number' && isFinite(c.trueIndex)) return c.trueIndex;
    if (typeof c.overall === 'number' && isFinite(c.overall)) return c.overall;
    if (typeof c.index === 'number' && isFinite(c.index)) return c.index;
    return fallback;
  }

  // ═══════════════════════════════════════════════════════════════════
  //  E1 · 明君回路（正反馈）
  // ═══════════════════════════════════════════════════════════════════

  /** 明君回路：皇威↑ × 皇权良 × 民心↑ × 腐败↓ → 循环加强 */
  function _checkEnlightenedLoop(ctx, mr) {
    var G = global.GM;
    if (!G.huangwei || !G.huangquan || !G.minxin) return;
    var hw = G.huangwei.index;
    var hq = G.huangquan.index;
    var mx = G.minxin.trueIndex;
    var corr = _corruptionIndex(G, 30);
    // 四件都好
    var isEnlightened = hw >= 70 && hw < 90 && hq >= 50 && hq <= 75 && mx >= 65 && corr < 35;
    if (!isEnlightened) { G._enlightenedStreak = 0; return; }
    // 连续回合累加
    G._enlightenedStreak = (G._enlightenedStreak || 0) + 1;
    if (G._enlightenedStreak < 3) return;
    // 加强 buff
    if (typeof global.AuthorityEngines !== 'undefined') {
      // 民心缓慢回升
      if (mx < 85) global.AuthorityEngines.adjustMinxin('imperialVirtue', 0.3 * mr, '明君回路');
      // 皇威微升
      if (hw < 88) global.AuthorityEngines.adjustHuangwei('benevolence', 0.2 * mr);
    }
    // 腐败缓降
    if (G.corruption && typeof G.corruption === 'object' && corr > 10) {
      G.corruption.trueIndex = Math.max(5, corr - 0.3 * mr);
      G.corruption.overall = G.corruption.trueIndex;
    }
    // 帑廪略加
    if (G.guoku && G._taxEfficiencyMult && G._taxEfficiencyMult > 0.8) {
      G.guoku.money += Math.floor((G.guoku.annualIncome || 10000000) * 0.002 * mr / 12);
    }
    if (G._enlightenedStreak === 6 && global.addEB) global.addEB('明君回路', '四海归心，文治武功，明君气象');
  }

  /** 末世崩溃链：皇威崩 + 皇权弱 + 民心溃 + 腐败爆 → 加速恶化 */
  function _checkCollapseChain(ctx, mr) {
    var G = global.GM;
    if (!G.huangwei || !G.huangquan || !G.minxin) return;
    var hw = G.huangwei.index;
    var hq = G.huangquan.index;
    var mx = G.minxin.trueIndex;
    var corr = _corruptionIndex(G, 30);
    var isCollapsing = hw <= 30 && hq <= 35 && mx <= 30 && corr >= 65;
    if (!isCollapsing) { G._collapseStreak = 0; return; }
    G._collapseStreak = (G._collapseStreak || 0) + 1;
    if (G._collapseStreak < 2) return;
    // 加速恶化
    if (typeof global.AuthorityEngines !== 'undefined') {
      global.AuthorityEngines.adjustMinxin('taxation', -0.4 * mr, '末世崩溃链');
      global.AuthorityEngines.adjustHuangwei('capitalFall', -0.3 * mr);
    }
    if (G.corruption && typeof G.corruption === 'object') { G.corruption.trueIndex = Math.min(100, corr + 0.5 * mr); G.corruption.overall = G.corruption.trueIndex; }
    // 帑廪流失
    if (G.guoku) G.guoku.money = Math.max(0, G.guoku.money - Math.floor((G.guoku.annualIncome || 10000000) * 0.003 * mr / 12));
    if (G._collapseStreak === 3 && global.addEB) global.addEB('末世', '风雨飘摇，气数将尽');
  }

  /** 腐败×皇威×帑廪漏损三角（暴君段 + 腐败高 + 帑廪紧缺 → 官僚蚕食加速） */
  function _checkLeakageTriangle(ctx, mr) {
    var G = global.GM;
    if (!G.huangwei || !G.corruption || !G.guoku) return;
    var tyrant = G.huangwei.tyrantSyndrome && G.huangwei.tyrantSyndrome.active;
    var corr = _corruptionIndex(G, 30);
    var lowTreasury = (G.guoku.money || 0) < (G.guoku.annualIncome || 10000000) * 0.1;
    if (!(tyrant && corr > 55 && lowTreasury)) { G._leakageActive = false; return; }
    G._leakageActive = true;
    // 浮收（官员虚报征收，吃差价）
    var lossRate = 0.01 * (corr / 100) * mr;
    var loss = Math.floor((G.guoku.annualIncome || 10000000) * lossRate / 12);
    G.guoku.money = Math.max(-999999999, (G.guoku.money || 0) - loss);
    // 民心受损
    if (typeof global.AuthorityEngines !== 'undefined') global.AuthorityEngines.adjustMinxin('taxation', -0.2 * mr, '浮收扰民');
    // 腐败加剧
    G.corruption.trueIndex = Math.min(100, corr + 0.2 * mr);
    G.corruption.overall = G.corruption.trueIndex;
    if (global.addEB && Math.random() < 0.1) global.addEB('漏损', '浮收蚕食，本月损 ' + loss + ' 钱');
  }

  /** 民心↔皇权倒U曲线（皇权过强或过弱都损民心；中庸最佳） */
  function _applyMinxinHuangquanInvertedU(ctx, mr) {
    var G = global.GM;
    if (!G.huangquan || !G.minxin) return;
    var hq = G.huangquan.index;
    // 倒U：60-70 最佳，偏离则降民心
    var distance = Math.abs(hq - 65);
    if (distance < 10) {
      // 最佳区间，民心缓升
      if (typeof global.AuthorityEngines !== 'undefined') global.AuthorityEngines.adjustMinxin('policyBalance', 0.05 * mr, '皇权中庸');
    } else if (distance > 25) {
      // 极端（过强或过弱）
      var delta = -0.1 * (distance - 25) / 35 * mr;
      if (typeof global.AuthorityEngines !== 'undefined') {
        global.AuthorityEngines.adjustMinxin('policyExtreme', delta, hq > 75 ? '专制过严' : '皇权不振');
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  E2 · 年度赋役总纲滑块 UI
  // ═══════════════════════════════════════════════════════════════════

  function openAnnualFuyiPanel() {
    var G = global.GM;
    if (!G) return;
    if (!G._annualFuyiDraft) G._annualFuyiDraft = {
      taxRateAdjust: 0,     // -0.3 ~ +0.3
      corveeMonths: 1,       // 0-3
      reliefExempt: [],      // 灾区免税
      targetIncome: (G.guoku && G.guoku.annualIncome) || 10000000
    };
    var draft = G._annualFuyiDraft;
    var body = '<div style="max-width:600px;font-family:inherit;">';
    body += '<div style="font-size:1.0rem;color:var(--gold-300);margin-bottom:0.4rem;letter-spacing:0.1em;">📜 年度赋役总纲</div>';
    body += '<div style="font-size:0.76rem;color:var(--ink-300);padding:8px 10px;background:var(--bg-2);border-radius:4px;margin-bottom:0.8rem;">户部尚书按常规奏本年总预。陛下可调滑块，定本年赋役基调。</div>';
    body += '<div style="padding:8px;">';
    // 税率调整
    body += '<div style="margin-bottom:12px;">';
    body += '<label style="font-size:0.8rem;color:var(--gold-400);">田赋增减（-30% ~ +30%）： <span id="fuyi-tax-v">' + (draft.taxRateAdjust * 100).toFixed(0) + '%</span></label>';
    body += '<input type="range" id="fuyi-tax" min="-30" max="30" step="5" value="' + (draft.taxRateAdjust*100) + '" style="width:100%;" oninput="document.getElementById(\'fuyi-tax-v\').textContent=this.value+\'%\';">';
    body += '</div>';
    // 徭役月数
    body += '<div style="margin-bottom:12px;">';
    body += '<label style="font-size:0.8rem;color:var(--gold-400);">徭役月数（0-3）： <span id="fuyi-corvee-v">' + draft.corveeMonths + ' 月</span></label>';
    body += '<input type="range" id="fuyi-corvee" min="0" max="3" step="1" value="' + draft.corveeMonths + '" style="width:100%;" oninput="document.getElementById(\'fuyi-corvee-v\').textContent=this.value+\' 月\';">';
    body += '</div>';
    // 蠲免灾区
    body += '<div style="margin-bottom:12px;">';
    body += '<label style="font-size:0.8rem;color:var(--gold-400);">蠲免灾区（输入区域 ID，逗号分隔）：</label>';
    body += '<input type="text" id="fuyi-relief" value="' + (draft.reliefExempt || []).join(',') + '" style="width:100%;padding:6px;background:var(--bg-2);border:1px solid var(--bdr);color:var(--ink-100);font-family:inherit;font-size:0.78rem;">';
    body += '</div>';
    // 预估
    body += '<div style="font-size:0.74rem;color:var(--celadon-300);padding:8px 10px;background:var(--bg-2);border-radius:4px;margin-top:8px;" id="fuyi-preview">预估岁入变化：—</div>';
    body += '</div>';
    body += '<div style="display:flex;gap:6px;margin-top:0.6rem;">';
    body += '<button class="btn" style="background:var(--celadon-500);" onclick="PhaseE._approveFuyi()">准奏签发</button>';
    body += '<button class="btn" onclick="this.parentNode.parentNode.parentNode.remove()">搁置</button>';
    body += '</div>';
    body += '</div>';
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:19020;display:flex;align-items:center;justify-content:center;';
    ov.innerHTML = '<div style="background:var(--bg-1);border:1px solid var(--gold);border-radius:6px;padding:1.0rem;width:92%;max-width:620px;max-height:88vh;overflow-y:auto;">' + body + '</div>';
    ov.addEventListener('click', function(e) { if (e.target === ov) ov.remove(); });
    document.body.appendChild(ov);
  }

  function approveFuyi() {
    var G = global.GM;
    var taxEl = document.getElementById('fuyi-tax');
    var corveeEl = document.getElementById('fuyi-corvee');
    var reliefEl = document.getElementById('fuyi-relief');
    if (!taxEl) return;
    var tax = Number(taxEl.value) / 100;
    var corvee = Number(corveeEl.value);
    var relief = reliefEl.value.split(',').map(function(s){return s.trim();}).filter(Boolean);
    // 应用
    if (!G.fiscalConfig) G.fiscalConfig = {};
    G.fiscalConfig.annualFuyi = { taxRateAdjust: tax, corveeMonths: corvee, reliefExempt: relief, approvedTurn: G.turn };
    // 帑廪岁入调整
    if (G.guoku) {
      var targetDelta = Math.floor((G.guoku.annualIncome || 10000000) * tax);
      G.guoku._annualFuyiAdjust = targetDelta;
    }
    // 徭役
    if (G.population && G.population.corvee) {
      G.population.corvee.annualDays = corvee * 30;
    }
    // 民心反馈
    if (global._adjAuthority) {
      if (tax > 0.1) global._adjAuthority('minxin', -4);
      else if (tax < -0.1) global._adjAuthority('minxin', 5);
      if (relief.length > 0) global._adjAuthority('minxin', relief.length);
      if (corvee >= 2) global._adjAuthority('minxin', -3);
    }
    if (global.addEB) global.addEB('赋役', '本年田赋 ' + (tax*100).toFixed(0) + '%，徭役 ' + corvee + ' 月，蠲免 ' + relief.length + ' 区');
    var ovs = document.querySelectorAll('div[style*="z-index:19020"]');
    ovs.forEach(function(o){o.remove();});
    if (global.toast) global.toast('年度赋役总纲已颁');
  }

  // ═══════════════════════════════════════════════════════════════════
  //  E2 · editor-ai-gen 引用 EDICT_TEMPLATES 补丁
  // ═══════════════════════════════════════════════════════════════════

  function injectEdictTemplatesIntoAIGen() {
    if (typeof global.aiGenEdictSuggestion !== 'function' && typeof global.EdictParser !== 'undefined') {
      global.aiGenEdictSuggestion = function(context) {
        // 返回分类后的历代典范列表作为 AI 起草参考（含剧本自定义）
        var templates = (typeof global.EdictParser.getHistoricalEdictPresets === 'function')
          ? global.EdictParser.getHistoricalEdictPresets()
          : (global.EdictParser.HISTORICAL_EDICT_PRESETS || []);
        var byType = {};
        templates.forEach(function(t) {
          if (!byType[t.type]) byType[t.type] = [];
          byType[t.type].push(t);
        });
        return {
          templates: byType,
          totalCount: templates.length,
          suggestion: '参考历代典范，按朝代特色修辞'
        };
      };
    }
  }

  // ═══════════════════════════════════════════════════════════════════
  //  Tick + Init
  // ═══════════════════════════════════════════════════════════════════

  function tick(ctx) {
    ctx = ctx || {};
    var mr = ctx.monthRatio || 1;
    try { _checkEnlightenedLoop(ctx, mr); } catch(e) { (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'phaseE] enlightened:') : console.error('[phaseE] enlightened:', e); }
    try { _checkCollapseChain(ctx, mr); } catch(e) { (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'phaseE] collapse:') : console.error('[phaseE] collapse:', e); }
    try { _checkLeakageTriangle(ctx, mr); } catch(e) { (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'phaseE] leakage:') : console.error('[phaseE] leakage:', e); }
    try { _applyMinxinHuangquanInvertedU(ctx, mr); } catch(e) { (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'phaseE] invertedU:') : console.error('[phaseE] invertedU:', e); }
  }

  function init() {
    injectEdictTemplatesIntoAIGen();
  }

  // ═══════════════════════════════════════════════════════════════════
  //  导出
  // ═══════════════════════════════════════════════════════════════════

  global.PhaseE = {
    init: init,
    tick: tick,
    openAnnualFuyiPanel: openAnnualFuyiPanel,
    _approveFuyi: approveFuyi,
    injectEdictTemplatesIntoAIGen: injectEdictTemplatesIntoAIGen,
    VERSION: 1
  };

  global.openAnnualFuyiPanel = openAnnualFuyiPanel;

})(typeof window !== 'undefined' ? window : (typeof global !== 'undefined' ? global : this));
