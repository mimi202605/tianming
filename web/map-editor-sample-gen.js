// map-editor-sample-gen.js
// 生成 sample data 完整 map (含 placeholder polygon)
// hex grid layout·或 geographic hint (若 dynasty preset 提供)
// user 后期 drag 顶点 refine·此为起点
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[sample-gen] core not loaded'); return; }

  // ─── geo hints·按朝代手填的近似位置 (0-1 normalized) ────
  // 部分朝代提供·缺省的 fall back 到 grid layout
  var GEO_HINTS = {
    ming: {
      '北直隶':         { x: 0.55, y: 0.22 },
      '南直隶':         { x: 0.62, y: 0.50 },
      '山东布政司':     { x: 0.60, y: 0.35 },
      '山西布政司':     { x: 0.50, y: 0.30 },
      '河南布政司':     { x: 0.55, y: 0.42 },
      '陕西布政司':     { x: 0.40, y: 0.35 },
      '四川布政司':     { x: 0.35, y: 0.55 },
      '湖广布政司':     { x: 0.50, y: 0.55 },
      '江西布政司':     { x: 0.58, y: 0.62 },
      '浙江布政司':     { x: 0.68, y: 0.55 },
      '福建布政司':     { x: 0.65, y: 0.70 },
      '广东布政司':     { x: 0.55, y: 0.78 },
      '广西布政司':     { x: 0.45, y: 0.78 },
      '云南布政司':     { x: 0.30, y: 0.78 },
      '贵州布政司':     { x: 0.40, y: 0.68 },
      '辽东都司':       { x: 0.72, y: 0.18 },
      '大宁都司':       { x: 0.62, y: 0.15 },
      '万全都司':       { x: 0.50, y: 0.20 },
      '陕西行都司':     { x: 0.32, y: 0.30 },
      '四川行都司':     { x: 0.28, y: 0.50 },
      '湖广行都司':     { x: 0.42, y: 0.60 },
      '福建行都司':     { x: 0.62, y: 0.65 },
      '乌斯藏都司':     { x: 0.18, y: 0.50 },
      '朵甘都司':       { x: 0.22, y: 0.42 }
    },
    qing: {
      '直隶省':         { x: 0.55, y: 0.22 },
      '山东省':         { x: 0.60, y: 0.35 },
      '山西省':         { x: 0.50, y: 0.30 },
      '河南省':         { x: 0.55, y: 0.42 },
      '江苏省':         { x: 0.65, y: 0.45 },
      '安徽省':         { x: 0.60, y: 0.50 },
      '江西省':         { x: 0.58, y: 0.62 },
      '浙江省':         { x: 0.68, y: 0.55 },
      '福建省':         { x: 0.65, y: 0.70 },
      '湖北省':         { x: 0.50, y: 0.52 },
      '湖南省':         { x: 0.50, y: 0.62 },
      '陕西省':         { x: 0.40, y: 0.35 },
      '甘肃省':         { x: 0.30, y: 0.30 },
      '四川省':         { x: 0.35, y: 0.55 },
      '广东省':         { x: 0.55, y: 0.78 },
      '广西省':         { x: 0.45, y: 0.78 },
      '云南省':         { x: 0.30, y: 0.78 },
      '贵州省':         { x: 0.40, y: 0.68 },
      '盛京将军辖区':   { x: 0.72, y: 0.18 },
      '吉林将军辖区':   { x: 0.78, y: 0.12 },
      '黑龙江将军辖区': { x: 0.80, y: 0.08 },
      '伊犁将军辖区':   { x: 0.18, y: 0.25 },
      '乌里雅苏台':     { x: 0.40, y: 0.10 },
      '西藏':           { x: 0.18, y: 0.55 }
    },
    han: {
      '司隶校尉部':     { x: 0.50, y: 0.40 },
      '豫州':           { x: 0.55, y: 0.45 },
      '冀州':           { x: 0.55, y: 0.30 },
      '兖州':           { x: 0.58, y: 0.40 },
      '徐州':           { x: 0.62, y: 0.45 },
      '扬州':           { x: 0.65, y: 0.55 },
      '荆州':           { x: 0.50, y: 0.55 },
      '益州':           { x: 0.35, y: 0.55 },
      '凉州':           { x: 0.30, y: 0.30 },
      '并州':           { x: 0.45, y: 0.28 },
      '幽州':           { x: 0.62, y: 0.20 },
      '青州':           { x: 0.62, y: 0.38 },
      '交州':           { x: 0.52, y: 0.78 },
      '西域都护府':     { x: 0.18, y: 0.30 }
    },
    tang: {
      '关内道':         { x: 0.40, y: 0.38 },
      '河南道':         { x: 0.55, y: 0.42 },
      '河东道':         { x: 0.48, y: 0.32 },
      '河北道':         { x: 0.58, y: 0.28 },
      '山南道':         { x: 0.45, y: 0.50 },
      '陇右道':         { x: 0.32, y: 0.35 },
      '淮南道':         { x: 0.62, y: 0.50 },
      '江南道':         { x: 0.62, y: 0.60 },
      '剑南道':         { x: 0.32, y: 0.55 },
      '岭南道':         { x: 0.50, y: 0.78 },
      '安西大都护府':   { x: 0.15, y: 0.35 },
      '北庭都护府':     { x: 0.20, y: 0.20 },
      '安北都护府':     { x: 0.45, y: 0.10 },
      '安东都护府':     { x: 0.78, y: 0.18 }
    },
    yuan: {
      '中书省':         { x: 0.55, y: 0.30 },
      '岭北行省':       { x: 0.45, y: 0.10 },
      '辽阳行省':       { x: 0.75, y: 0.18 },
      '河南江北行省':   { x: 0.55, y: 0.45 },
      '陕西行省':       { x: 0.38, y: 0.38 },
      '甘肃行省':       { x: 0.28, y: 0.30 },
      '四川行省':       { x: 0.35, y: 0.55 },
      '云南行省':       { x: 0.30, y: 0.78 },
      '湖广行省':       { x: 0.50, y: 0.62 },
      '江浙行省':       { x: 0.65, y: 0.55 },
      '江西行省':       { x: 0.55, y: 0.65 },
      '宣政院辖地':     { x: 0.18, y: 0.55 },
      '征东行省':       { x: 0.85, y: 0.30 }
    },
    song: {
      '京畿路':         { x: 0.55, y: 0.42 },
      '京东东路':       { x: 0.62, y: 0.40 },
      '京东西路':       { x: 0.58, y: 0.43 },
      '京西南路':       { x: 0.50, y: 0.50 },
      '京西北路':       { x: 0.50, y: 0.42 },
      '河北东路':       { x: 0.60, y: 0.30 },
      '河北西路':       { x: 0.55, y: 0.30 },
      '河东路':         { x: 0.48, y: 0.32 },
      '永兴军路':       { x: 0.42, y: 0.40 },
      '秦凤路':         { x: 0.32, y: 0.40 },
      '淮南东路':       { x: 0.65, y: 0.48 },
      '淮南西路':       { x: 0.60, y: 0.50 },
      '两浙路':         { x: 0.68, y: 0.55 },
      '江南东路':       { x: 0.62, y: 0.58 },
      '江南西路':       { x: 0.55, y: 0.62 },
      '荆湖南路':       { x: 0.50, y: 0.65 },
      '荆湖北路':       { x: 0.48, y: 0.55 },
      '成都府路':       { x: 0.32, y: 0.55 },
      '梓州路':         { x: 0.36, y: 0.55 },
      '利州路':         { x: 0.35, y: 0.48 },
      '夔州路':         { x: 0.42, y: 0.55 },
      '福建路':         { x: 0.65, y: 0.70 },
      '广南东路':       { x: 0.55, y: 0.78 },
      '广南西路':       { x: 0.45, y: 0.78 }
    },
    qin: {
      '内史':           { x: 0.45, y: 0.40 },
      '陇西郡':         { x: 0.32, y: 0.35 },
      '北地郡':         { x: 0.38, y: 0.28 },
      '上郡':           { x: 0.45, y: 0.30 },
      '汉中郡':         { x: 0.42, y: 0.45 },
      '蜀郡':           { x: 0.35, y: 0.55 }
    },
    shang_zhou: {
      '王畿':           { x: 0.50, y: 0.40 },
      '齐':             { x: 0.62, y: 0.38 },
      '鲁':             { x: 0.60, y: 0.45 },
      '晋':             { x: 0.50, y: 0.32 },
      '楚':             { x: 0.55, y: 0.55 },
      '秦':             { x: 0.40, y: 0.40 }
    },
    republic: {
      '河北省':         { x: 0.55, y: 0.22 },
      '山东省':         { x: 0.60, y: 0.32 },
      '河南省':         { x: 0.55, y: 0.40 },
      '江苏省':         { x: 0.65, y: 0.42 },
      '浙江省':         { x: 0.68, y: 0.55 },
      '安徽省':         { x: 0.60, y: 0.48 },
      '福建省':         { x: 0.65, y: 0.68 },
      '江西省':         { x: 0.58, y: 0.60 },
      '湖北省':         { x: 0.50, y: 0.50 },
      '湖南省':         { x: 0.50, y: 0.62 },
      '广东省':         { x: 0.55, y: 0.78 },
      '广西省':         { x: 0.45, y: 0.78 },
      '云南省':         { x: 0.30, y: 0.78 },
      '贵州省':         { x: 0.40, y: 0.68 },
      '四川省':         { x: 0.35, y: 0.55 },
      '陕西省':         { x: 0.40, y: 0.35 },
      '甘肃省':         { x: 0.28, y: 0.30 },
      '青海省':         { x: 0.22, y: 0.40 },
      '宁夏省':         { x: 0.34, y: 0.28 },
      '绥远省':         { x: 0.45, y: 0.20 },
      '察哈尔省':       { x: 0.55, y: 0.18 },
      '热河省':         { x: 0.65, y: 0.18 },
      '辽宁省':         { x: 0.72, y: 0.20 },
      '吉林省':         { x: 0.78, y: 0.13 },
      '黑龙江省':       { x: 0.80, y: 0.07 },
      '新疆省':         { x: 0.16, y: 0.25 },
      '西藏地方':       { x: 0.18, y: 0.55 },
      '蒙古地方':       { x: 0.42, y: 0.10 }
    }
  };

  // ─── grid fall-back layout ────────────────────────────────

  function gridLayout(divisions, w, h){
    var n = divisions.length;
    var cols = Math.ceil(Math.sqrt(n));
    var rows = Math.ceil(n / cols);
    var cellW = w / (cols + 1);
    var cellH = h / (rows + 1);
    return divisions.map(function(div, i){
      var col = i % cols;
      var row = Math.floor(i / cols);
      var cx = (col + 1) * cellW;
      var cy = (row + 1) * cellH;
      var r = Math.min(cellW, cellH) * 0.42;
      return makeHexAt(cx, cy, r);
    });
  }

  // ─── geo hint layout ──────────────────────────────────────

  function geoLayout(divisions, w, h, hints){
    return divisions.map(function(div){
      var hint = hints[div.name];
      if (!hint){
        // fallback: random in canvas
        var cx = w * 0.4 + Math.random() * w * 0.2;
        var cy = h * 0.4 + Math.random() * h * 0.2;
        return makeHexAt(cx, cy, Math.min(w, h) * 0.05);
      }
      var cx2 = hint.x * w;
      var cy2 = hint.y * h;
      var r2 = Math.min(w, h) * 0.06;
      return makeHexAt(cx2, cy2, r2);
    });
  }

  function makeHexAt(cx, cy, r){
    var poly = [];
    for (var k = 0; k < 6; k++){
      var angle = (k / 6) * Math.PI * 2 + Math.PI / 6;
      poly.push([
        cx + r * Math.cos(angle),
        cy + r * Math.sin(angle)
      ]);
    }
    return poly;
  }

  // ─── public API ──────────────────────────────────────────

  function generateSampleMap(dynastyId, opts){
    opts = opts || {};
    var w = opts.width || 1280;
    var h = opts.height || 800;

    var dyn = TM.MapEditor.dynasty.get(dynastyId);
    var samples = dyn.sampleDivisions || [];
    var hints = GEO_HINTS[dynastyId] || {};
    var hasHints = Object.keys(hints).length > 0;

    var polygons = hasHints
      ? geoLayout(samples, w, h, hints)
      : gridLayout(samples, w, h);

    // 给每 sample 配一个 division
    var divisions = samples.map(function(sample, idx){
      var defaultAut = sample.autonomy || dyn.defaultAutonomy || 'zhixia';
      if (defaultAut === 'mixed') defaultAut = 'zhixia';

      var d = ME.createDivision({
        name: sample.name,
        level: sample.level || 'province',
        regionType: sample.regionType || dyn.defaultRegionType || 'normal',
        terrain: dyn.defaultTerrain,
        polygon: polygons[idx],
        autonomy: {
          type: defaultAut,
          subtype: '',
          holder: '',
          suzerain: '',
          loyalty: 80,
          tributeRate: 0
        },
        byEthnicity: dyn.ethnicityDefault ? Object.assign({}, dyn.ethnicityDefault) : null,
        byFaith: dyn.faithDefault ? Object.assign({}, dyn.faithDefault) : null,
        // crossDynastyId·按 name 默认·user 后期 link 同地异朝
        crossDynastyId: ''
      });
      ME.recomputeDerived(d);
      return d;
    });

    return {
      version: 1,
      dynasty: dynastyId,
      era: dyn.sampleEra,
      title: dyn.label + ' · 样本',
      bitmapUrl: '',
      bitmapWidth: w,
      bitmapHeight: h,
      divisions: divisions,
      meta: {
        author: 'sample-gen',
        notes: '自动生成·' + (hasHints ? 'geo-hint' : 'grid') + ' 布局·user drag 顶点 refine',
        createdAt: Date.now(),
        sampleGen: true
      }
    };
  }

  function loadSample(dynastyId){
    if (ME.EDITOR.dirty){
      if (!confirm('当前有未保存改动·载入样本将覆盖·确认?')) return false;
    }
    var map = generateSampleMap(dynastyId);
    ME.loadMap(map);
    return true;
  }

  function exportSample(dynastyId){
    var map = generateSampleMap(dynastyId);
    var data = JSON.stringify(map, null, 2);
    var name = dynastyId + '-sample-' + new Date().toISOString().slice(0,10) + '.json';
    if (ME.io && ME.io.download) ME.io.download(name, data, 'application/json');
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.sampleGen = {
    GEO_HINTS: GEO_HINTS,
    generateSampleMap: generateSampleMap,
    loadSample: loadSample,
    exportSample: exportSample
  };

})(typeof window !== 'undefined' ? window : this);
