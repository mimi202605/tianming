// map-editor-ai.js
// AI 填默认值·选省 → AI 推 ~30 字段 (基于 name + level + dynasty + region)
// 调用·若 editor-ai-gen.js 加载·复用其 callAI·否则用 fetch 自查 OpenAI/Anthropic key
// fallback·rule-based 默认值 (基于朝代 preset + level + name 启发)
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[ai] core not loaded'); return; }

  // ─── prompt builder ──────────────────────────────────────

  function buildPrompt(d, dynastyId){
    var dyn = TM.MapEditor.dynasty.get(dynastyId);
    return [
      '你是中国历史地理专家·补全 ' + dyn.label + '朝代行政区划字段·',
      '',
      '已知·',
      '- 朝代·' + dyn.label + ' (' + dyn.yearRange[0] + '-' + dyn.yearRange[1] + ')',
      '- 时代·' + (ME.EDITOR.map.era || dyn.sampleEra),
      '- 省名·' + d.name,
      '- 级别·' + d.level + ' (' + (dyn.levels.find(function(L){ return L.key === d.level; }) || {}).label + ')',
      '- 当前 polygon area·' + Math.round(d.area || 0) + ' 像素',
      d.terrain ? '- 已知 terrain·' + d.terrain : '',
      d.regionType !== 'normal' ? '- regionType·' + d.regionType : '',
      '',
      '请输出 JSON·补全以下字段 (无把握项·留 null·勿臆造)·',
      '',
      '{',
      '  "officialPosition": "...",   // 此省主官称呼·如 "知府" / "巡抚" / "节度使"',
      '  "terrain": "...",            // 平原/丘陵/山地/水乡/沿海/沙漠/草原/高原',
      '  "specialResources": "...",   // 主产物·"盐 / 铁 / 丝绸 / 茶" 等',
      '  "prosperity": 50,            // 0-100',
      '  "taxLevel": "中",            // 轻 / 中 / 重',
      '  "populationDetail": {',
      '    "households": 50000,       // 户数 (按朝代 + 省份估)',
      '    "mouths": 250000,          // 口数·户均 4-6',
      '    "ding": 80000              // 丁数·~ mouths * 0.3',
      '  },',
      '  "byEthnicity": { "汉": 0.95 },  // 主族 + 副族·和应 = 1',
      '  "byFaith": { "儒": 0.4, "佛": 0.3, "道": 0.2, "民间": 0.1 },',
      '  "minxinLocal": 60,           // 0-100',
      '  "corruptionLocal": 30,       // 0-100',
      '  "autonomy": {                 // 自治',
      '    "type": "zhixia",          // zhixia/fanguo/fanzhen/jimi/chaogong',
      '    "loyalty": 80,',
      '    "tributeRate": 0',
      '  },',
      '  "fiscalDetail": {',
      '    "claimedRevenue": 100000,  // 名义赋税',
      '    "actualRevenue": 80000,    // 实征收',
      '    "compliance": 0.8,         // 0-1',
      '    "skimmingRate": 0.15       // 0-1',
      '  },',
      '  "isCapital": false,          // 是否都城',
      '  "isFrontier": false,         // 是否边镇',
      '  "isJunDi": false,            // 是否军镇',
      '  "isTradePort": false,        // 是否商埠',
      '  "isHistoric": false          // 是否历史名城',
      '}',
      '',
      '只回 JSON·不带前后说明·不带 markdown·'
    ].filter(Boolean).join('\n');
  }

  // ─── rule-based fallback (无 AI 时) ──────────────────────

  function fillRuleBased(d, dynastyId){
    var dyn = TM.MapEditor.dynasty.get(dynastyId);
    var patch = {};
    var pop = (function(){
      // 极简启发·按 level 给规模
      if (d.level === 'province') return { households: 200000, mouths: 1000000, ding: 300000 };
      if (d.level === 'prefecture') return { households: 30000, mouths: 150000, ding: 45000 };
      if (d.level === 'county') return { households: 5000, mouths: 25000, ding: 7500 };
      if (d.level === 'district') return { households: 1000, mouths: 5000, ding: 1500 };
      return { households: 50000, mouths: 250000, ding: 75000 };
    })();
    patch.populationDetail = Object.assign({}, d.populationDetail, pop, {
      fugitives: Math.round(pop.households * 0.05),
      hiddenCount: Math.round(pop.households * 0.1)
    });
    patch.byEthnicity = Object.assign({}, dyn.ethnicityDefault);
    patch.byFaith = Object.assign({}, dyn.faithDefault);
    patch.terrain = d.terrain || dyn.defaultTerrain;
    patch.prosperity = d.prosperity != null ? d.prosperity : 50;
    patch.taxLevel = d.taxLevel || '中';
    patch.minxinLocal = d.minxinLocal != null ? d.minxinLocal : 60;
    patch.corruptionLocal = d.corruptionLocal != null ? d.corruptionLocal : 30;
    if (!d.autonomy || !d.autonomy.type){
      patch.autonomy = { type: dyn.defaultAutonomy === 'mixed' ? 'zhixia' : (dyn.defaultAutonomy || 'zhixia'),
                         subtype: '', holder: '', suzerain: '', loyalty: 80, tributeRate: 0 };
    }
    if (!d.fiscalDetail){
      var tax = pop.mouths * 0.1;  // 极简
      patch.fiscalDetail = {
        claimedRevenue: Math.round(tax),
        actualRevenue: Math.round(tax * 0.85),
        remittedToCenter: Math.round(tax * 0.6),
        retainedBudget: Math.round(tax * 0.25),
        compliance: 0.85,
        skimmingRate: 0.15,
        autonomyLevel: 0.1
      };
    }
    return patch;
  }

  // ─── AI call (复用 editor-ai-gen) ────────────────────────

  function callAI(prompt, callback){
    // 复用 editor-ai-gen.js·若 TM.Editor.aiGen.callAI 或 callAI 暴露
    if (global.TM && TM.Editor && TM.Editor.aiGen && typeof TM.Editor.aiGen.callAI === 'function'){
      TM.Editor.aiGen.callAI(prompt, callback);
      return;
    }
    if (typeof global.callAI === 'function'){
      global.callAI(prompt, callback);
      return;
    }
    // fallback·提示 user 用 fallback
    callback(null, new Error('AI 接口未挂载·使用 rule-based 默认填充'));
  }

  // ─── parse response ─────────────────────────────────────

  function parseAIResponse(txt){
    if (!txt) return null;
    // 找 JSON block
    var m = txt.match(/\{[\s\S]*\}/);
    if (!m) return null;
    try {
      return JSON.parse(m[0]);
    } catch(e){
      console.error('[ai] parse fail:', e, txt.slice(0, 200));
      return null;
    }
  }

  // ─── apply patch ────────────────────────────────────────

  function applyPatch(d, patch){
    if (!patch) return;
    // build merged
    var merged = {};
    Object.keys(patch).forEach(function(k){
      if (patch[k] === null || patch[k] === undefined) return;
      // nested object·shallow merge
      if (typeof patch[k] === 'object' && !Array.isArray(patch[k])){
        merged[k] = Object.assign({}, d[k] || {}, patch[k]);
      } else {
        merged[k] = patch[k];
      }
    });
    ME.updateDivision(d.id, merged, 'AI fill ' + d.name);
  }

  // ─── public api ─────────────────────────────────────────

  function fillSelected(opts){
    opts = opts || {};
    var sel = ME.getSelected();
    if (sel.length === 0){
      meAlert('请先选省 (V 工具)');
      return;
    }
    if (sel.length > 5 && !opts.skipConfirm){
      if (!confirm('AI 填 ' + sel.length + ' 省·将逐 1 调 AI·可能耗时·继续?')) return;
    }

    var useRule = !!opts.ruleOnly;
    var dynastyId = ME.EDITOR.map.dynasty;

    var i = 0, ok = 0, fail = 0;
    var PG = TM.MapEditor.progress;
    if (PG) PG.open({
      title: useRule ? '规则填字' : 'AI 填字',
      message: '准备·' + sel.length + ' 省',
      total: sel.length,
      cancellable: true
    });

    function finish(){
      if (PG) PG.close();
      if (global.meToast){
        meToast((useRule ? '规则' : 'AI') + ' 填 完·' + ok + ' 成 / ' + fail + ' 败', fail ? 'warn' : 'success');
      }
    }

    function step(){
      if (PG && PG.isCancelled()){
        if (global.meToast) meToast('已取消·' + i + ' / ' + sel.length, 'warn');
        if (PG) PG.close();
        return;
      }
      if (i >= sel.length){
        finish();
        return;
      }
      var d = sel[i++];
      if (PG) PG.update(i, (useRule ? '规则·' : 'AI·') + i + '/' + sel.length + '·' + d.name);

      if (useRule){
        var patch = fillRuleBased(d, dynastyId);
        applyPatch(d, patch);
        ok++;
        setTimeout(step, 30);
        return;
      }

      var prompt = buildPrompt(d, dynastyId);
      callAI(prompt, function(resp, err){
        if (err){
          var p = fillRuleBased(d, dynastyId);
          applyPatch(d, p);
          ok++;
          setTimeout(step, 30);
          return;
        }
        var parsed = parseAIResponse(resp);
        if (!parsed){
          fail++;
          var p2 = fillRuleBased(d, dynastyId);
          applyPatch(d, p2);
          setTimeout(step, 30);
          return;
        }
        applyPatch(d, parsed);
        ok++;
        setTimeout(step, 30);
      });
    }
    step();
  }

  function fillAllRuleBased(){
    var n = ME.EDITOR.map.divisions.length;
    if (n === 0){ meAlert('无省可填'); return; }
    if (!confirm('rule-based 填全 ' + n + ' 省·覆盖现有空字段·继续? (undo 可救)')) return;
    var dynastyId = ME.EDITOR.map.dynasty;
    ME.commitMutation('rule fill all', function(){
      ME.EDITOR.map.divisions.forEach(function(d){
        var patch = fillRuleBased(d, dynastyId);
        Object.keys(patch).forEach(function(k){
          if (patch[k] === null || patch[k] === undefined) return;
          if (typeof patch[k] === 'object' && !Array.isArray(patch[k])){
            d[k] = Object.assign({}, d[k] || {}, patch[k]);
          } else {
            d[k] = patch[k];
          }
        });
      });
    });
    var statusEl = document.getElementById('status-tip');
    if (statusEl) statusEl.textContent = 'rule fill 完成·' + n + ' 省';
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.ai = {
    fillSelected: fillSelected,
    fillAllRuleBased: fillAllRuleBased,
    fillRuleBased: fillRuleBased,
    buildPrompt: buildPrompt,
    parseAIResponse: parseAIResponse
  };

})(typeof window !== 'undefined' ? window : this);
