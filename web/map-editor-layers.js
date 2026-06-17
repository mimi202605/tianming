// map-editor-layers.js
// heatmap·渲染 5 涂层 + legend
// none / 人口 / 税 / 文化 / 宗教 / 自治
// hooks·core.js render() 之 polygon 渲染 (在 layers != 'none' 时·覆盖默认色)
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[layers] core not loaded'); return; }

  // ─── color scales (5 段) ──────────────────────────────────

  // 暖色 ramp (人口 / 税·按数值)·1=低·5=高
  var POP_RAMP = ['#1f3a4f', '#3a5d6e', '#7a8a4f', '#c9a96e', '#dc4f3a'];
  var TAX_RAMP = ['#2a3a4f', '#4a5d6e', '#7a7e4f', '#c9a96e', '#b65a30'];

  // 文化·按 dominant ethnicity·查色表
  var ETHNIC_COLOR = {
    '汉':       '#3d4f6a',
    '满':       '#8a4030',
    '蒙':       '#a08020',
    '回':       '#4a7a4a',
    '藏':       '#7a4a8a',
    '苗':       '#a06030',
    '壮':       '#6a8a3a',
    '彝':       '#8a6a4a',
    '维':       '#3a8a8a',
    '朝':       '#5a3a8a',
    '契丹':     '#704a30',
    '女真':     '#5a4a30',
    '党项':     '#7a5a40',
    '突厥':     '#5a8a3a',
    '吐蕃':     '#7a4a8a',
    '回鹘':     '#3a8a4a',
    '匈奴':     '#5a3a30',
    '羌':       '#a08070',
    '越':       '#4aa080',
    '华夏':     '#3d4f6a',
    '色目':     '#a06080',
    '蛮':       '#5a7a3a',
    '夷':       '#5a5a30',
    '戎':       '#7a5a3a',
    '狄':       '#3a5a7a',
    '诸蕃':     '#6a6a6a',
    '其他':     '#5a5a5a'
  };

  // 宗教·按 dominant faith
  var FAITH_COLOR = {
    '儒':         '#c9a96e',
    '佛':         '#a06030',
    '道':         '#3a7a8a',
    '巫':         '#5a3a30',
    '祖':         '#7a5a40',
    '萨满':       '#5a4a30',
    '伊':         '#3a7a4a',
    '基':         '#5a7a8a',
    '祆':         '#a05030',
    '摩尼':       '#a07050',
    '也里可温':   '#7a8a8a',
    '犹':         '#5a5a8a',
    '拜火':       '#a05030',
    '民间':       '#6a6a6a'
  };

  // 自治·5 type 配色
  var AUTONOMY_COLOR = {
    'zhixia':   '#3d4f6a',
    'fanguo':   '#8a3a2e',
    'fanzhen':  '#b65a30',
    'jimi':     '#6a8a3a',
    'chaogong': '#7a6a3a'
  };

  // ─── color helpers ────────────────────────────────────────

  function hexWithAlpha(hex, alpha){
    if (!hex || hex[0] !== '#') return 'rgba(120,120,120,' + alpha + ')';
    var r = parseInt(hex.slice(1,3), 16);
    var g = parseInt(hex.slice(3,5), 16);
    var b = parseInt(hex.slice(5,7), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
  }

  function quantile5(values){
    if (values.length === 0) return [0,1,2,3,4];
    var sorted = values.slice().sort(function(a,b){ return a - b; });
    var n = sorted.length;
    return [
      sorted[0],
      sorted[Math.floor(n * 0.25)],
      sorted[Math.floor(n * 0.5)],
      sorted[Math.floor(n * 0.75)],
      sorted[n - 1]
    ];
  }

  function bucket5(v, qs){
    if (v <= qs[0]) return 0;
    if (v <= qs[1]) return 1;
    if (v <= qs[2]) return 2;
    if (v <= qs[3]) return 3;
    return 4;
  }

  function dominantKey(map){
    if (!map) return null;
    var best = null, bestV = -1;
    for (var k in map){
      if (map[k] > bestV){ bestV = map[k]; best = k; }
    }
    return best;
  }

  // ─── public api ───────────────────────────────────────────

  // 给定 division·返回该涂层下的 fill color (rgba)
  function getHeatColor(d, mode, ctx){
    if (mode === 'none' || !mode) return null;

    if (mode === 'pop'){
      var v = (d.populationDetail && d.populationDetail.mouths) || 0;
      var bk = bucket5(v, ctx.popQuantiles);
      return hexWithAlpha(POP_RAMP[bk], 0.7);
    }
    if (mode === 'tax'){
      var fd = d.fiscalDetail || {};
      var v2 = fd.actualRevenue || fd.claimedRevenue || 0;
      var bk2 = bucket5(v2, ctx.taxQuantiles);
      return hexWithAlpha(TAX_RAMP[bk2], 0.7);
    }
    if (mode === 'culture'){
      var key = dominantKey(d.byEthnicity);
      var c = key ? ETHNIC_COLOR[key] : null;
      return c ? hexWithAlpha(c, 0.7) : 'rgba(80,80,80,0.55)';
    }
    if (mode === 'faith'){
      var key2 = dominantKey(d.byFaith);
      var c2 = key2 ? FAITH_COLOR[key2] : null;
      return c2 ? hexWithAlpha(c2, 0.7) : 'rgba(80,80,80,0.55)';
    }
    if (mode === 'autonomy'){
      var typ = (d.autonomy && d.autonomy.type) || 'zhixia';
      return hexWithAlpha(AUTONOMY_COLOR[typ] || '#5a5a5a', 0.7);
    }
    // Phase 21.12·新 view modes
    if (mode === 'terrain'){
      var t = d.terrain || '平原';
      var TC = {
        '平原': '#a0b07a', '丘陵': '#8a7a4a', '山地': '#6a5a40',
        '高原': '#c0b09a', '盆地': '#8a8a5a', '沙漠': '#dac888',
        '草原': '#9aa86a', '森林': '#506a40', '湖泊': '#5a90b8',
        '沼泽': '#5a7a60', '海洋': '#3a6a90'
      };
      return hexWithAlpha(TC[t] || '#7a7a6a', 0.65);
    }
    if (mode === 'realm'){
      // 按 dejureOwner / autonomy.suzerain 着色·suzerain 先·string hash 色
      var owner = (d.autonomy && d.autonomy.suzerain) || d.dejureOwner || '中央';
      return hexWithAlpha(stringToColor(owner), 0.65);
    }
    if (mode === 'climate'){
      var CL = TM.MapEditor.climate;
      if (CL && CL.classify){
        var cl = CL.classify(d);
        return CL.CLIMATE_COLOR[cl] || 'rgba(80,80,80,0.55)';
      }
      return null;
    }
    return null;
  }

  function stringToColor(s){
    var hash = 0;
    s = String(s || '');
    for (var i = 0; i < s.length; i++){
      hash = s.charCodeAt(i) + ((hash << 5) - hash);
      hash |= 0;
    }
    var hue = Math.abs(hash) % 360;
    return hslToHex(hue, 55, 45);
  }
  function hslToHex(h, s, l){
    s /= 100; l /= 100;
    var c = (1 - Math.abs(2 * l - 1)) * s;
    var x = c * (1 - Math.abs((h / 60) % 2 - 1));
    var m = l - c / 2;
    var r = 0, g = 0, b = 0;
    if (h < 60){ r = c; g = x; }
    else if (h < 120){ r = x; g = c; }
    else if (h < 180){ g = c; b = x; }
    else if (h < 240){ g = x; b = c; }
    else if (h < 300){ r = x; b = c; }
    else { r = c; b = x; }
    return '#' + [r, g, b].map(function(v){
      var hex = Math.round((v + m) * 255).toString(16);
      return hex.length === 1 ? '0' + hex : hex;
    }).join('');
  }

  // 计算 heatmap context (quantile etc)·调用前准备
  function prepareContext(mode){
    var divs = ME.EDITOR.map.divisions;
    var ctx = {};
    if (mode === 'pop'){
      var vs = divs.map(function(d){ return (d.populationDetail && d.populationDetail.mouths) || 0; });
      ctx.popQuantiles = quantile5(vs);
    }
    if (mode === 'tax'){
      var vs2 = divs.map(function(d){
        var fd = d.fiscalDetail || {};
        return fd.actualRevenue || fd.claimedRevenue || 0;
      });
      ctx.taxQuantiles = quantile5(vs2);
    }
    return ctx;
  }

  // ─── legend (DOM render) ──────────────────────────────────

  function renderLegend(mode){
    if (!mode || mode === 'none') return '';
    if (mode === 'pop'){
      var ctx = prepareContext('pop');
      return '\
        <div class="me-legend-title">人口 (mouths)</div>\
        ' + POP_RAMP.map(function(c, i){
          var lo = ctx.popQuantiles[i];
          var hi = ctx.popQuantiles[i + 1];
          return '<div class="me-legend-row"><span class="me-legend-sw" style="background:' + c + '"></span>' + (i === POP_RAMP.length - 1 ? '≥' + fmt(lo) : fmt(lo) + ' ~ ' + fmt(hi)) + '</div>';
        }).join('') + '\
      ';
    }
    if (mode === 'tax'){
      var ctx2 = prepareContext('tax');
      return '\
        <div class="me-legend-title">税 (actual revenue)</div>\
        ' + TAX_RAMP.map(function(c, i){
          var lo = ctx2.taxQuantiles[i];
          var hi = ctx2.taxQuantiles[i + 1];
          return '<div class="me-legend-row"><span class="me-legend-sw" style="background:' + c + '"></span>' + (i === TAX_RAMP.length - 1 ? '≥' + fmt(lo) : fmt(lo) + ' ~ ' + fmt(hi)) + '</div>';
        }).join('') + '\
      ';
    }
    if (mode === 'culture'){
      // collect unique dominant ethnicities
      var seen = {};
      ME.EDITOR.map.divisions.forEach(function(d){
        var k = dominantKey(d.byEthnicity);
        if (k && !seen[k]) seen[k] = ETHNIC_COLOR[k] || '#5a5a5a';
      });
      var keys = Object.keys(seen);
      if (keys.length === 0) return '<div class="me-legend-empty">(无族群数据)</div>';
      return '\
        <div class="me-legend-title">族群 (dominant)</div>\
        ' + keys.map(function(k){
          return '<div class="me-legend-row"><span class="me-legend-sw" style="background:' + seen[k] + '"></span>' + k + '</div>';
        }).join('') + '\
      ';
    }
    if (mode === 'faith'){
      var seen2 = {};
      ME.EDITOR.map.divisions.forEach(function(d){
        var k = dominantKey(d.byFaith);
        if (k && !seen2[k]) seen2[k] = FAITH_COLOR[k] || '#5a5a5a';
      });
      var keys2 = Object.keys(seen2);
      if (keys2.length === 0) return '<div class="me-legend-empty">(无信仰数据)</div>';
      return '\
        <div class="me-legend-title">信仰 (dominant)</div>\
        ' + keys2.map(function(k){
          return '<div class="me-legend-row"><span class="me-legend-sw" style="background:' + seen2[k] + '"></span>' + k + '</div>';
        }).join('') + '\
      ';
    }
    if (mode === 'autonomy'){
      return '\
        <div class="me-legend-title">自治</div>\
        ' + Object.keys(AUTONOMY_COLOR).map(function(k){
          var l = ({zhixia:'直辖',fanguo:'藩国',fanzhen:'藩镇',jimi:'羁縻',chaogong:'朝贡'})[k];
          return '<div class="me-legend-row"><span class="me-legend-sw" style="background:' + AUTONOMY_COLOR[k] + '"></span>' + l + '</div>';
        }).join('') + '\
      ';
    }
    return '';
  }

  function fmt(n){
    if (n == null) return '?';
    if (n >= 1e8) return (n / 1e8).toFixed(1) + '亿';
    if (n >= 1e4) return (n / 1e4).toFixed(1) + '万';
    return Math.round(n);
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.layers = {
    POP_RAMP: POP_RAMP,
    TAX_RAMP: TAX_RAMP,
    ETHNIC_COLOR: ETHNIC_COLOR,
    FAITH_COLOR: FAITH_COLOR,
    AUTONOMY_COLOR: AUTONOMY_COLOR,
    getHeatColor: getHeatColor,
    prepareContext: prepareContext,
    renderLegend: renderLegend
  };

})(typeof window !== 'undefined' ? window : this);
