// map-editor-text.js
// 字注·text annotation·与 division 平行的标注 entity·中度升级 v2
// 存 map.annotations[]·新 schema·见 createAnnotation
// T 工具·click 空白处加注·hit 现有字注则拖动
// 渲染·支持竖排 / 5 种背景 (none/rect/seal/scroll/ellipse) / 描边 / 自定义字体 / 斜体
// 5 类预设 (capital / province / prefecture / town / historic) 一键套样式
// 删 division 时自动孤立同 divisionId 字注 (text 保留·divisionId 清空)
//
// 2026-05-08

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[text] core not loaded'); return; }

  // ─── 字体 / 预设常量 ──────────────────────────────────────

  var FONT_FAMILIES = {
    kaiti:    '"STKaiti","KaiTi","楷体","Noto Serif SC",serif',
    songti:   '"STSong","SimSun","宋体","Noto Serif SC",serif',
    fangsong: '"FangSong","仿宋","STFangsong",serif',
    lishu:    '"STLiti","LiSu","隶书",serif',
    zhuanshu: '"STXingkai","STZhongsong","篆体",serif'
  };

  // 5 类预设·适配中国古地图标注层级·
  //   scaleMode·'screen' = 屏空间恒定 (不随 zoom 变)·'world' = 世界空间·随地块缩放
  //   minZoom·zoom 远时越早隐·避拥挤
  var PRESETS = {
    capital: {                         // 首都·朱印 + 大字 + 粗·全 zoom 不变·屏空间
      fontFamily: 'kaiti', fontSize: 28, color: '#fff5e6', weight: 'bold',
      bgStyle: 'seal', bgColor: '#a83838',
      strokeColor: '', strokeWidth: 0, shadow: true,
      italic: false, vertical: false, minZoom: 0,
      scaleMode: 'screen'
    },
    province: {                        // 省 / 道·楷书金·随地块缩放
      fontFamily: 'kaiti', fontSize: 22, color: '#d8b863', weight: 'bold',
      bgStyle: '', bgColor: '',
      strokeColor: 'rgba(0,0,0,0.55)', strokeWidth: 1.5, shadow: true,
      italic: false, vertical: false, minZoom: 0.3,
      scaleMode: 'world'
    },
    prefecture: {                      // 府·中楷·浅金·随地块缩放
      fontFamily: 'kaiti', fontSize: 16, color: '#c9a96e', weight: 'normal',
      bgStyle: '', bgColor: '',
      strokeColor: 'rgba(0,0,0,0.4)', strokeWidth: 1, shadow: true,
      italic: false, vertical: false, minZoom: 0.6,
      scaleMode: 'world'
    },
    town: {                            // 重镇·宋体·随地块缩放
      fontFamily: 'songti', fontSize: 13, color: '#d4cfc0', weight: 'normal',
      bgStyle: '', bgColor: '',
      strokeColor: '', strokeWidth: 0, shadow: true,
      italic: false, vertical: false, minZoom: 1.0,
      scaleMode: 'world'
    },
    historic: {                        // 历史地名·斜体仿宋·随地块缩放
      fontFamily: 'fangsong', fontSize: 12, color: '#8a8275', weight: 'normal',
      bgStyle: '', bgColor: '',
      strokeColor: '', strokeWidth: 0, shadow: false,
      italic: true, vertical: false, minZoom: 1.2,
      scaleMode: 'world'
    },
    custom: null  // sentinel·custom = 不应用任何 preset
  };

  // ─── annotation factory ──────────────────────────────────

  function createAnnotation(opts){
    opts = opts || {};
    var preset = opts.preset || 'province';
    var defaults = PRESETS[preset] || PRESETS.province;
    return {
      id:           opts.id || ('note_' + Date.now() + '_' + Math.floor(Math.random()*9999)),
      text:         opts.text || '注',
      position:     opts.position || [0, 0],
      // ── 挂 division (空 = floating) ──
      divisionId:   opts.divisionId || '',
      // ── 预设 ──
      preset:       preset,
      // ── 字 ──
      fontFamily:   opts.fontFamily   != null ? opts.fontFamily   : defaults.fontFamily,
      fontSize:     opts.fontSize     != null ? opts.fontSize     : defaults.fontSize,
      color:        opts.color        != null ? opts.color        : defaults.color,
      weight:       opts.weight       != null ? opts.weight       : defaults.weight,
      italic:       opts.italic       != null ? opts.italic       : defaults.italic,
      // ── 排版 ──
      vertical:     opts.vertical     != null ? opts.vertical     : defaults.vertical,
      rotation:     opts.rotation     != null ? opts.rotation     : 0,
      letterSpacing:opts.letterSpacing!= null ? opts.letterSpacing: 0,
      // ── 描边 / 阴影 ──
      strokeColor:  opts.strokeColor  != null ? opts.strokeColor  : defaults.strokeColor,
      strokeWidth:  opts.strokeWidth  != null ? opts.strokeWidth  : defaults.strokeWidth,
      shadow:       opts.shadow       != null ? opts.shadow       : defaults.shadow,
      // ── 背景 ──
      bgStyle:      opts.bgStyle      != null ? opts.bgStyle      : defaults.bgStyle,  // ''|'rect'|'seal'|'scroll'|'ellipse'
      bgColor:      opts.bgColor      != null ? opts.bgColor      : defaults.bgColor,
      // ── 缩放衰减·camera.zoom < minZoom 时不渲染 ──
      minZoom:      opts.minZoom      != null ? opts.minZoom      : defaults.minZoom,
      // ── 缩放模式·'screen' = 屏空间恒定·'world' = 随地块缩放 ──
      scaleMode:    opts.scaleMode    != null ? opts.scaleMode    : (defaults.scaleMode || 'screen'),
      // ── timeline·EDITOR.viewYear 不在区间则不渲染·null = 永远显示 ──
      establishedYear: opts.establishedYear != null ? opts.establishedYear : null,
      abolishedYear:   opts.abolishedYear   != null ? opts.abolishedYear   : null
    };
  }

  // 套用 preset·覆盖 visual 字段·保留 text/position/divisionId
  function applyPreset(note, preset){
    if (!PRESETS[preset]) return;
    var defaults = PRESETS[preset];
    if (!defaults){ note.preset = 'custom'; return; }  // custom = no-op
    note.preset = preset;
    note.fontFamily = defaults.fontFamily;
    note.fontSize = defaults.fontSize;
    note.color = defaults.color;
    note.weight = defaults.weight;
    note.italic = defaults.italic;
    note.vertical = defaults.vertical;
    note.strokeColor = defaults.strokeColor;
    note.strokeWidth = defaults.strokeWidth;
    note.shadow = defaults.shadow;
    note.bgStyle = defaults.bgStyle;
    note.bgColor = defaults.bgColor;
    note.minZoom = defaults.minZoom;
    note.scaleMode = defaults.scaleMode || 'screen';
  }

  // ─── ensure annotations array ────────────────────────────

  function ensureAnnotations(){
    if (!ME.EDITOR.map.annotations) ME.EDITOR.map.annotations = [];
    return ME.EDITOR.map.annotations;
  }

  // ─── add / remove / update ──────────────────────────────

  function addAnnotation(opts){
    var newId = null;
    ME.commitMutation('add annotation', function(){
      var arr = ensureAnnotations();
      var note = createAnnotation(opts);
      arr.push(note);
      newId = note.id;
      ME.fire('annotation-added', { annotation: note });
    });
    return newId;
  }

  function removeAnnotation(id){
    ME.commitMutation('remove annotation', function(){
      var arr = ensureAnnotations();
      var idx = arr.findIndex(function(a){ return a.id === id; });
      if (idx >= 0) arr.splice(idx, 1);
    });
  }

  function updateAnnotation(id, patch){
    ME.commitMutation('update annotation', function(){
      var arr = ensureAnnotations();
      var note = arr.find(function(a){ return a.id === id; });
      if (note) Object.assign(note, patch);
    });
  }

  function listAnnotations(){
    return ensureAnnotations().slice();
  }

  // ─── render·hook 到 core.render ─────────────────────────

  function _resolveFontStr(note, fz){
    var fam = FONT_FAMILIES[note.fontFamily] || FONT_FAMILIES.kaiti;
    var w = note.weight === 'bold' ? 'bold ' : '';
    var i = note.italic ? 'italic ' : '';
    return i + w + fz + 'px ' + fam;
  }

  // bg 默认色按 style·user 不指定时用合理 fallback
  var BG_DEFAULT_COLORS = {
    rect:      'rgba(28,24,20,0.78)',     // 半透深灰·适大多数地图
    seal:      '#a83838',                 // 朱印
    scroll:    'rgba(60,42,28,0.85)',     // 木色卷轴
    ellipse:   'rgba(34,30,24,0.70)',     // 半透墨玉
    tablet:    'rgba(45,32,20,0.88)',     // 匾·檀木深褐
    stele:     'rgba(78,75,68,0.85)',     // 碑·灰石
    banner:    '#7a3a3a',                 // 旗·绛红
    pavilion:  'rgba(58,38,24,0.90)',     // 亭·栋木
    cloud:     'rgba(232,220,180,0.55)',  // 云·淡米白
    tile:      'rgba(64,52,44,0.85)',     // 瓦·窑灰
    underline: '',                        // 无填充·underline 仅画线
    frame:     ''                         // 无填充·frame 仅描边
  };

  function _drawHorizontalText(ctx, note, fz, ss){
    // ss = screenScale = 1 / zoom·让 shadow 偏移和 stroke 宽在屏空间恒定
    var letterSp = note.letterSpacing || 0;
    if (!letterSp){
      // shadow·1px 屏空间
      if (note.shadow){
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillText(note.text, 1 * ss, 1 * ss);
      }
      // stroke·屏空间宽度
      if (note.strokeColor && note.strokeWidth > 0){
        ctx.strokeStyle = note.strokeColor;
        ctx.lineWidth = note.strokeWidth * ss;
        ctx.lineJoin = 'round';
        ctx.miterLimit = 2;
        ctx.strokeText(note.text, 0, 0);
      }
      // fill
      ctx.fillStyle = note.color || '#f5e8c8';
      ctx.fillText(note.text, 0, 0);
    } else {
      // letter-spacing 手动·先量整段宽以便 center
      var totalW = 0;
      for (var i = 0; i < note.text.length; i++){
        totalW += ctx.measureText(note.text[i]).width;
      }
      totalW += letterSp * (note.text.length - 1);
      var x = -totalW / 2;
      ctx.textAlign = 'left';
      for (var j = 0; j < note.text.length; j++){
        if (note.shadow){ ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(note.text[j], x + 1 * ss, 1 * ss); }
        if (note.strokeColor && note.strokeWidth > 0){
          ctx.strokeStyle = note.strokeColor;
          ctx.lineWidth = note.strokeWidth * ss;
          ctx.lineJoin = 'round';
          ctx.strokeText(note.text[j], x, 0);
        }
        ctx.fillStyle = note.color || '#f5e8c8';
        ctx.fillText(note.text[j], x, 0);
        x += ctx.measureText(note.text[j]).width + letterSp;
      }
    }
  }

  function _drawVerticalText(ctx, note, fz, ss){
    // 竖排·一字一行·从上到下·默认行高 1.1·letterSpacing 当行高加成
    var rowH = fz * 1.1 + (note.letterSpacing || 0);
    var n = note.text.length;
    var totalH = rowH * n;
    var y = -totalH / 2 + rowH / 2;
    ctx.textAlign = 'center';
    for (var i = 0; i < n; i++){
      if (note.shadow){ ctx.fillStyle = 'rgba(0,0,0,0.7)'; ctx.fillText(note.text[i], 1 * ss, y + 1 * ss); }
      if (note.strokeColor && note.strokeWidth > 0){
        ctx.strokeStyle = note.strokeColor;
        ctx.lineWidth = note.strokeWidth * ss;
        ctx.lineJoin = 'round';
        ctx.strokeText(note.text[i], 0, y);
      }
      ctx.fillStyle = note.color || '#f5e8c8';
      ctx.fillText(note.text[i], 0, y);
      y += rowH;
    }
  }

  // 量竖排最宽字·避免 fz×1.6 死值过紧 / 过松
  function _measureVerticalMaxWidth(ctx, text){
    var max = 0;
    for (var i = 0; i < text.length; i++){
      var w = ctx.measureText(text[i]).width;
      if (w > max) max = w;
    }
    return max;
  }

  function _drawBg(ctx, note, fz, ss){
    if (!note.bgStyle) return;
    var pad = fz * 0.32;
    var w, h;
    if (note.vertical){
      w = _measureVerticalMaxWidth(ctx, note.text) + pad * 2;
      h = fz * 1.1 * note.text.length + pad * 2;
    } else {
      var metrics = ctx.measureText(note.text);
      w = metrics.width + pad * 2;
      h = fz * 1.25;
    }
    var bg = note.bgColor || BG_DEFAULT_COLORS[note.bgStyle] || 'rgba(28,24,20,0.78)';
    ctx.fillStyle = bg;
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1 * ss;

    if (note.bgStyle === 'rect'){
      // 微圆角 (1.5px 屏空间)
      var rr = 1.5 * ss * Math.min(fz / (1.5 * ss), 4);  // small rounded
      _roundRect(ctx, -w/2, -h/2, w, h, Math.min(rr, w/2, h/2));
      ctx.fill(); ctx.stroke();
    } else if (note.bgStyle === 'seal'){
      // 朱印·1 字圆·多字方·圆半径 = 字大小 × 0.7
      if (note.text.length === 1 && !note.vertical){
        var r = fz * 0.7;
        ctx.beginPath();
        ctx.arc(0, 0, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.lineWidth = 1.5 * ss;
        ctx.stroke();
        // 内圈·风格化
        ctx.strokeStyle = 'rgba(255,235,200,0.35)';
        ctx.lineWidth = 1 * ss;
        ctx.beginPath();
        ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2);
        ctx.stroke();
      } else {
        // 方印·边框双线
        var ext = pad * 0.3;
        ctx.fillRect(-w/2 - ext, -h/2 - ext, w + ext * 2, h + ext * 2);
        ctx.lineWidth = 1.5 * ss;
        ctx.strokeRect(-w/2 - ext, -h/2 - ext, w + ext * 2, h + ext * 2);
        // 内边框
        ctx.strokeStyle = 'rgba(255,235,200,0.4)';
        ctx.lineWidth = 1 * ss;
        ctx.strokeRect(-w/2, -h/2, w, h);
      }
    } else if (note.bgStyle === 'scroll'){
      // 卷轴·两端弧形·中间矩形
      var endR = h / 2;
      ctx.beginPath();
      ctx.moveTo(-w/2 + endR, -h/2);
      ctx.lineTo(w/2 - endR, -h/2);
      ctx.arc(w/2 - endR, 0, endR, -Math.PI/2, Math.PI/2);
      ctx.lineTo(-w/2 + endR, h/2);
      ctx.arc(-w/2 + endR, 0, endR, Math.PI/2, -Math.PI/2);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (note.bgStyle === 'ellipse'){
      ctx.beginPath();
      ctx.ellipse(0, 0, w/2, h/2, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    } else if (note.bgStyle === 'tablet'){
      // 匾·双层矩形 + 四角小金钉
      var ext1 = pad * 0.35;
      ctx.fillRect(-w/2 - ext1, -h/2 - ext1, w + ext1*2, h + ext1*2);
      ctx.lineWidth = 1.5 * ss;
      ctx.strokeStyle = 'rgba(212,184,99,0.65)';
      ctx.strokeRect(-w/2 - ext1, -h/2 - ext1, w + ext1*2, h + ext1*2);
      ctx.lineWidth = 1 * ss;
      ctx.strokeStyle = 'rgba(212,184,99,0.4)';
      ctx.strokeRect(-w/2, -h/2, w, h);
      // 四角钉
      var nail = ext1 * 0.6;
      ctx.fillStyle = 'rgba(212,184,99,0.85)';
      [[-w/2-ext1*0.5,-h/2-ext1*0.5],[w/2+ext1*0.5,-h/2-ext1*0.5],
       [-w/2-ext1*0.5, h/2+ext1*0.5],[w/2+ext1*0.5, h/2+ext1*0.5]].forEach(function(c){
        ctx.beginPath(); ctx.arc(c[0], c[1], nail, 0, Math.PI*2); ctx.fill();
      });
    } else if (note.bgStyle === 'stele'){
      // 碑·上弧顶 + 下矩形·适竖排
      var topR = w / 2;
      ctx.beginPath();
      ctx.moveTo(-w/2, -h/2 + topR);
      ctx.arc(0, -h/2 + topR, topR, Math.PI, 0, false);
      ctx.lineTo(w/2, h/2);
      ctx.lineTo(-w/2, h/2);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1.2 * ss;
      ctx.strokeStyle = 'rgba(0,0,0,0.55)';
      ctx.stroke();
      // 内边框·风格
      ctx.lineWidth = 1 * ss;
      ctx.strokeStyle = 'rgba(255,250,240,0.18)';
      ctx.beginPath();
      var iPad = pad * 0.4;
      ctx.moveTo(-w/2 + iPad, -h/2 + topR);
      ctx.arc(0, -h/2 + topR, topR - iPad, Math.PI, 0, false);
      ctx.lineTo(w/2 - iPad, h/2 - iPad);
      ctx.lineTo(-w/2 + iPad, h/2 - iPad);
      ctx.closePath();
      ctx.stroke();
    } else if (note.bgStyle === 'banner'){
      // 旗·矩形 + 右端三角凹口·飘旌旗
      var notch = h * 0.35;
      ctx.beginPath();
      ctx.moveTo(-w/2, -h/2);
      ctx.lineTo( w/2, -h/2);
      ctx.lineTo( w/2 - notch, 0);
      ctx.lineTo( w/2,  h/2);
      ctx.lineTo(-w/2,  h/2);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1 * ss;
      ctx.stroke();
      // 顶杆短线·旗杆
      ctx.beginPath();
      ctx.moveTo(-w/2, -h/2 - pad * 0.4);
      ctx.lineTo(-w/2,  h/2 + pad * 0.4);
      ctx.lineWidth = 2 * ss;
      ctx.strokeStyle = 'rgba(80,55,30,0.9)';
      ctx.stroke();
    } else if (note.bgStyle === 'pavilion'){
      // 亭·三角顶 + 矩形身
      var roofH = h * 0.45;
      var roofExt = w * 0.12;
      ctx.beginPath();
      // 屋顶
      ctx.moveTo(-w/2 - roofExt, -h/2 + roofH);
      ctx.lineTo(0, -h/2);
      ctx.lineTo(w/2 + roofExt, -h/2 + roofH);
      // 亭身
      ctx.lineTo(w/2, -h/2 + roofH);
      ctx.lineTo(w/2, h/2);
      ctx.lineTo(-w/2, h/2);
      ctx.lineTo(-w/2, -h/2 + roofH);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1 * ss;
      ctx.stroke();
      // 屋脊深色
      ctx.beginPath();
      ctx.moveTo(-w/2 - roofExt, -h/2 + roofH);
      ctx.lineTo(0, -h/2);
      ctx.lineTo(w/2 + roofExt, -h/2 + roofH);
      ctx.lineWidth = 1.5 * ss;
      ctx.strokeStyle = 'rgba(0,0,0,0.5)';
      ctx.stroke();
    } else if (note.bgStyle === 'cloud'){
      // 云·三瓣云气·上多弧·底缓平
      var cArc = h * 0.42;
      ctx.beginPath();
      ctx.moveTo(-w/2, h/2);
      ctx.quadraticCurveTo(-w/2 - cArc * 0.3, 0, -w/2 + cArc * 0.5, -h/2 + cArc * 0.3);
      ctx.arc(-w/4, -h/2 + cArc * 0.3, cArc * 0.55, Math.PI, Math.PI * 1.95, false);
      ctx.arc(0, -h/2, cArc * 0.55, Math.PI * 1.05, Math.PI * 1.95, false);
      ctx.arc(w/4, -h/2 + cArc * 0.3, cArc * 0.55, Math.PI * 1.05, 0, false);
      ctx.quadraticCurveTo(w/2 + cArc * 0.3, 0, w/2, h/2);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 0.8 * ss;
      ctx.strokeStyle = 'rgba(120,100,70,0.7)';
      ctx.stroke();
    } else if (note.bgStyle === 'tile'){
      // 瓦·瓦当形·上半圆 + 下平
      ctx.beginPath();
      ctx.arc(0, h/2, w/2, Math.PI, 0, false);
      ctx.lineTo(-w/2, h/2);
      ctx.closePath();
      ctx.fill();
      ctx.lineWidth = 1 * ss;
      ctx.stroke();
    } else if (note.bgStyle === 'underline'){
      // 仅底线·不填充·留 text 主导
      ctx.beginPath();
      ctx.moveTo(-w/2 + pad * 0.2, h/2 - pad * 0.2);
      ctx.lineTo( w/2 - pad * 0.2, h/2 - pad * 0.2);
      ctx.lineWidth = 1.5 * ss;
      ctx.strokeStyle = note.bgColor || (note.color || '#d8b863');
      ctx.stroke();
    } else if (note.bgStyle === 'frame'){
      // 空框·只描边·无填充
      var frameClr = note.bgColor || 'rgba(216,184,99,0.7)';
      ctx.lineWidth = 1.2 * ss;
      ctx.strokeStyle = frameClr;
      _roundRect(ctx, -w/2, -h/2, w, h, Math.min(2 * ss, w/4, h/4));
      ctx.stroke();
    }
  }

  function _roundRect(ctx, x, y, w, h, r){
    r = Math.max(0, Math.min(r, w/2, h/2));
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  // 在 core 渲染完后调·绘 annotation 层
  function renderLayer(ctx, camera){
    var arr = ME.EDITOR.map.annotations;
    if (!arr || arr.length === 0) return;
    var dragId  = ME.EDITOR._textDragId  || null;
    var hoverId = ME.EDITOR._textHoverId || null;
    var zoom = (camera && camera.zoom) || 1;
    var ss   = 1 / zoom;                  // screen-scale·1px 屏幕 = ss 世界
    var viewYear = ME.EDITOR.viewYear;    // null = 不过滤·否则按区间隐显

    arr.forEach(function(note){
      // 缩放衰减·zoom 小于 minZoom 不渲染·但 drag/hover 中的字注永显
      if (note.id !== dragId && note.id !== hoverId){
        var minZ = note.minZoom != null ? note.minZoom : 0;
        if (zoom < minZ) return;
      }
      // timeline 区间·viewYear 在 [established, abolished] 外则不渲
      if (viewYear != null){
        if (note.establishedYear != null && viewYear < note.establishedYear) return;
        if (note.abolishedYear   != null && viewYear > note.abolishedYear)   return;
      }
      ctx.save();
      ctx.translate(note.position[0], note.position[1]);
      if (note.rotation) ctx.rotate(note.rotation * Math.PI / 180);

      // scaleMode·screen = 屏空间恒定 (capital)·world = 随地块缩放 (其余)
      // dfx = decoration 系数·screen mode 下 = ss·world mode 下 = 1
      var dfx, fz;
      if (note.scaleMode === 'world'){
        dfx = 1;
        fz = note.fontSize || 16;
      } else {
        dfx = ss;
        fz = (note.fontSize || 16) * ss;
      }
      ctx.font = _resolveFontStr(note, fz);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      _drawBg(ctx, note, fz, dfx);
      if (note.vertical) _drawVerticalText(ctx, note, fz, dfx);
      else _drawHorizontalText(ctx, note, fz, dfx);

      // 选中圈·dragging = 金色虚线圆·hovering = 浅金细虚线·**始终屏空间** (UI 反馈)
      if (dragId === note.id || hoverId === note.id){
        // ring 半径跟字大小 (fz)·两 mode 下都对·线宽屏恒定
        var ring = fz * 0.9;
        ctx.beginPath();
        ctx.arc(0, 0, ring, 0, Math.PI * 2);
        if (dragId === note.id){
          ctx.strokeStyle = '#d8b863';
          ctx.lineWidth = 2 * ss;
          ctx.setLineDash([4 * ss, 3 * ss]);
        } else {
          ctx.strokeStyle = 'rgba(216,184,99,0.55)';
          ctx.lineWidth = 1 * ss;
          ctx.setLineDash([3 * ss, 3 * ss]);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.restore();
    });
  }

  // ─── tool·T 工具 click / hitTest / drag ─────────────────

  // 命中测试·返回 annotation id 或 null·worldX/Y 已在世界坐标
  function hitTest(worldX, worldY){
    var arr = ME.EDITOR.map.annotations;
    if (!arr || !arr.length) return null;
    var camera = ME.EDITOR.camera || { zoom: 1 };
    var zoom = camera.zoom || 1;
    // 倒序查·最后画的在最上层
    for (var i = arr.length - 1; i >= 0; i--){
      var note = arr[i];
      var dx = worldX - note.position[0];
      var dy = worldY - note.position[1];
      // hitbox·按 fontSize × text 长 估·screen mode 时 fz 在世界 = fontSize / zoom
      var fz = note.fontSize || 16;
      if (note.scaleMode !== 'world') fz = fz / zoom;
      var len = (note.text || '').length || 1;
      var hbW, hbH;
      if (note.vertical){ hbW = fz * 1.2; hbH = fz * 1.2 * len; }
      else { hbW = fz * 0.6 * len + fz * 0.5; hbH = fz * 1.4; }
      // rotation 命中近似·忽略 rot 影响 (可后续精确)
      if (Math.abs(dx) <= hbW / 2 && Math.abs(dy) <= hbH / 2) return note.id;
    }
    return null;
  }

  // drag state 在 EDITOR 上·避免模块多次实例
  function startDrag(id){
    ME.EDITOR._textDragId = id;
    ME.EDITOR._textDragOrigPos = null;
    var arr = ME.EDITOR.map.annotations;
    var note = arr && arr.find(function(a){ return a.id === id; });
    if (note) ME.EDITOR._textDragOrigPos = note.position.slice();
    ME.requestRender();
  }
  function dragTo(worldX, worldY){
    var id = ME.EDITOR._textDragId;
    if (!id) return;
    var arr = ME.EDITOR.map.annotations || [];
    var note = arr.find(function(a){ return a.id === id; });
    if (!note) return;
    note.position[0] = worldX;
    note.position[1] = worldY;
    ME.requestRender();
  }
  // 鼠标 hover·更新 EDITOR._textHoverId·返回当前 hover 的 id (null = 无)
  function updateHover(worldX, worldY){
    var prev = ME.EDITOR._textHoverId || null;
    var id = hitTest(worldX, worldY);
    if (id !== prev){
      ME.EDITOR._textHoverId = id;
      ME.requestRender();
    }
    return id;
  }

  // 清 hover (鼠标离开 canvas / 切工具时)
  function clearHover(){
    if (ME.EDITOR._textHoverId){
      ME.EDITOR._textHoverId = null;
      ME.requestRender();
    }
  }

  function endDrag(){
    var id = ME.EDITOR._textDragId;
    if (!id){ return; }
    var arr = ME.EDITOR.map.annotations || [];
    var note = arr.find(function(a){ return a.id === id; });
    var orig = ME.EDITOR._textDragOrigPos;
    ME.EDITOR._textDragId = null;
    ME.EDITOR._textDragOrigPos = null;
    if (note && orig && (orig[0] !== note.position[0] || orig[1] !== note.position[1])){
      // 落点·走 commitMutation 上 undo·必先回滚再 mutation 再 set
      var newX = note.position[0], newY = note.position[1];
      note.position[0] = orig[0]; note.position[1] = orig[1];
      ME.commitMutation('move annotation', function(){
        note.position[0] = newX; note.position[1] = newY;
      });
    } else {
      ME.requestRender();
    }
  }

  function handleClick(worldX, worldY){
    var text = prompt('字注内容·(空=取消)', '注');
    if (!text || !text.trim()) return;
    addAnnotation({
      text: text.trim(),
      position: [worldX, worldY]
    });
    var statusEl = document.getElementById('status-tip');
    if (statusEl) statusEl.textContent = '加字注·"' + text.trim() + '" @ ' + Math.round(worldX) + ',' + Math.round(worldY);
  }

  // dblclick 就地编辑·hit 字注则改 text·不开 modal
  function handleDblClick(worldX, worldY){
    var id = hitTest(worldX, worldY);
    if (!id) return false;
    var arr = ensureAnnotations();
    var note = arr.find(function(a){ return a.id === id; });
    if (!note) return false;
    var newText = prompt('改字注·(空=不变)', note.text);
    if (newText == null) return true;             // 取消
    var trimmed = newText.trim();
    if (!trimmed || trimmed === note.text) return true;
    updateAnnotation(id, { text: trimmed });
    return true;
  }

  // ─── division removal 钩·清同 divisionId 字注·or 转 floating ─

  // 默策略·divisionId 设为 ''·字注保留 (不删·避免误伤·user 可手动删)
  function _onDivisionRemoved(payload){
    var id = payload && payload.id;
    if (!id) return;
    var arr = ensureAnnotations();
    var hits = arr.filter(function(a){ return a.divisionId === id; });
    if (hits.length === 0) return;
    ME.commitMutation('orphan annotations on division removal', function(){
      hits.forEach(function(a){ a.divisionId = ''; });
    });
    if (global.meToast) global.meToast(hits.length + ' 条字注转 floating', 'info', 1500);
  }

  function init(){
    if (ME.on){
      ME.on('division-removed', _onDivisionRemoved);
      // 切工具离开 text·清 hover 残留
      ME.on('tool-change', function(payload){
        if (payload && payload.tool !== 'text') clearHover();
      });
    }
  }

  // ─── panel UI·annotations 列表 (扩展·见 cut 2) ─────────

  function openManagerModal(){
    var arr = listAnnotations();
    var divs = (ME.EDITOR.map.divisions || []).slice();
    var modalEl = document.getElementById('me-text-modal');
    if (!modalEl){
      modalEl = document.createElement('div');
      modalEl.id = 'me-text-modal';
      modalEl.style.cssText = 'position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:9999; background:#1a1a1f; border:1px solid #3a3530; border-radius:6px; padding:14px 18px; min-width:980px; max-width:96vw; max-height:80vh; overflow:auto; color:#e8ddc8; font-family:inherit; box-shadow:0 8px 30px rgba(0,0,0,0.6); display:none;';
      document.body.appendChild(modalEl);
    }

    function divOpts(curId){
      var head = '<option value=""' + (!curId ? ' selected' : '') + '>(floating)</option>';
      return head + divs.map(function(D){
        return '<option value="' + D.id + '"' + (D.id === curId ? ' selected' : '') + '>' + esc(D.name || D.id) + '</option>';
      }).join('');
    }
    var FONT_OPTS = ['kaiti','songti','fangsong','lishu','zhuanshu'];
    var FONT_LBL = { kaiti:'楷', songti:'宋', fangsong:'仿宋', lishu:'隶', zhuanshu:'篆' };
    var BG_OPTS = ['','rect','seal','scroll','ellipse','tablet','stele','banner','pavilion','cloud','tile','underline','frame'];
    var BG_LBL = {
      '':'无', rect:'方', seal:'印', scroll:'卷', ellipse:'椭',
      tablet:'匾', stele:'碑', banner:'旗', pavilion:'亭',
      cloud:'云', tile:'瓦', underline:'画', frame:'框'
    };
    var PRESET_OPTS = ['capital','province','prefecture','town','historic','custom'];
    var PRESET_LBL = { capital:'都', province:'省', prefecture:'府', town:'镇', historic:'古', custom:'自' };
    var SCALE_OPTS = ['screen','world'];
    var SCALE_LBL = { screen:'屏', world:'世' };

    function fontOptsFor(cur){
      return FONT_OPTS.map(function(f){
        return '<option value="' + f + '"' + (f === cur ? ' selected' : '') + '>' + FONT_LBL[f] + '</option>';
      }).join('');
    }
    function bgOptsFor(cur){
      return BG_OPTS.map(function(b){
        return '<option value="' + b + '"' + (b === cur ? ' selected' : '') + '>' + BG_LBL[b] + '</option>';
      }).join('');
    }
    function presetOptsFor(cur){
      return PRESET_OPTS.map(function(p){
        return '<option value="' + p + '"' + (p === cur ? ' selected' : '') + '>' + PRESET_LBL[p] + '</option>';
      }).join('');
    }
    function scaleOptsFor(cur){
      return SCALE_OPTS.map(function(s){
        return '<option value="' + s + '"' + (s === cur ? ' selected' : '') + '>' + SCALE_LBL[s] + '</option>';
      }).join('');
    }

    var GRID_COLS = '1.3fr 32px 32px 44px 32px 44px 28px 28px 44px 32px 0.85fr 46px 50px 50px 22px';
    var listHtml = arr.length === 0
      ? '<div style="padding:14px; color:#6a6560; text-align:center;">(无字注·T 工具点击 canvas 加注·dblclick 改文字)</div>'
      : '<div style="display:grid; grid-template-columns:' + GRID_COLS + '; gap:3px; font-size:9px; color:#6a6560; padding:0 4px 4px;">'
      + '<div>文字</div><div title="预设·都/省/府/镇/古/自">设</div><div title="缩放·屏=恒定/世=随地块">缩</div><div title="字号">号</div><div title="字体·楷/宋/仿/隶/篆">体</div><div title="颜色">色</div><div title="竖排">竖</div><div title="斜体">斜</div><div title="背景·13 种">背</div><div title="背景色">底</div><div title="挂区划">挂</div><div title="旋转·度">转</div><div title="起始年·空=永有">起年</div><div title="废止年·空=永有">废年</div><div></div>'
      + '</div>'
      + arr.map(function(note){
          return '<div class="me-note-row" data-note-id="' + note.id + '" style="display:grid; grid-template-columns:' + GRID_COLS + '; gap:3px; padding:4px; border-bottom:1px solid #2a2a30; align-items:center; font-size:11px;">'
            + '<input data-note-text type="text" value="' + esc(note.text) + '" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:2px 5px; border-radius:2px; font-family:inherit; font-size:11px;" />'
            + '<select data-note-preset style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:1px; border-radius:2px;">' + presetOptsFor(note.preset) + '</select>'
            + '<select data-note-scale style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:1px; border-radius:2px;">' + scaleOptsFor(note.scaleMode || 'screen') + '</select>'
            + '<input data-note-size type="number" value="' + note.fontSize + '" min="6" max="80" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:2px 4px; border-radius:2px; font-family:Menlo,monospace; font-size:11px;" />'
            + '<select data-note-font style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:1px; border-radius:2px;">' + fontOptsFor(note.fontFamily) + '</select>'
            + '<input data-note-color type="color" value="' + (note.color || '#f5e8c8') + '" style="width:100%; height:22px; padding:0; border:1px solid #3a3530; border-radius:2px;" />'
            + '<input data-note-vert type="checkbox" ' + (note.vertical ? 'checked' : '') + ' style="margin:0 auto; display:block;" title="竖排" />'
            + '<input data-note-italic type="checkbox" ' + (note.italic ? 'checked' : '') + ' style="margin:0 auto; display:block;" title="斜体" />'
            + '<select data-note-bg style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:1px; border-radius:2px;">' + bgOptsFor(note.bgStyle) + '</select>'
            + '<input data-note-bgcolor type="color" value="' + (note.bgColor || '#a83838') + '" style="width:100%; height:22px; padding:0; border:1px solid #3a3530; border-radius:2px;" />'
            + '<select data-note-div style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:1px; border-radius:2px; font-size:10px;">' + divOpts(note.divisionId) + '</select>'
            + '<input data-note-rot type="number" value="' + (note.rotation || 0) + '" min="-180" max="180" step="5" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:2px 4px; border-radius:2px; font-family:Menlo,monospace; font-size:11px;" />'
            + '<input data-note-est type="number" placeholder="—" value="' + (note.establishedYear != null ? note.establishedYear : '') + '" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:2px 4px; border-radius:2px; font-family:Menlo,monospace; font-size:11px;" title="起始年·空=永有" />'
            + '<input data-note-abo type="number" placeholder="—" value="' + (note.abolishedYear != null ? note.abolishedYear : '') + '" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:2px 4px; border-radius:2px; font-family:Menlo,monospace; font-size:11px;" title="废止年·空=永有" />'
            + '<button data-note-del style="background:transparent; color:#c04030; border:1px solid #c04030; border-radius:2px; cursor:pointer; padding:0 6px;">×</button>'
          + '</div>';
        }).join('');

    modalEl.innerHTML = '\
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">\
        <div style="font-size:14px; color:#c9a96e;">字注 ' + arr.length + ' 条·中度升级 v2</div>\
        <button id="me-text-close" style="background:transparent; color:#9a8470; border:1px solid #3a3530; border-radius:3px; cursor:pointer; padding:4px 10px;">×</button>\
      </div>\
      <div style="font-size:10px; color:#6a6560; margin-bottom:8px;">canvas T 工具·空白处 click 加新·hit 字注则拖·dblclick 改文字</div>\
      ' + listHtml + '\
      <div style="display:flex; gap:8px; justify-content:flex-end; margin-top:10px;">\
        <button id="me-text-clear" style="background:transparent; color:#c08030; border:1px solid #c08030; border-radius:3px; cursor:pointer; padding:4px 10px;">清空所有</button>\
        <button id="me-text-add" style="background:transparent; color:#d8b863; border:1px solid #d8b863; border-radius:3px; cursor:pointer; padding:4px 10px;">+ 加 (画布中央)</button>\
      </div>\
    ';
    modalEl.style.display = 'block';

    document.getElementById('me-text-close').onclick = function(){ modalEl.style.display = 'none'; };
    document.getElementById('me-text-clear').onclick = function(){
      var n = arr.length;
      if (n === 0) return;
      if (!confirm('清空全部 ' + n + ' 条字注?')) return;
      ME.commitMutation('clear annotations', function(){
        ensureAnnotations().length = 0;
      });
      modalEl.style.display = 'none';
    };
    document.getElementById('me-text-add').onclick = function(){
      var text = prompt('字注内容', '新注');
      if (!text || !text.trim()) return;
      var w = ME.EDITOR.map.bitmapWidth || 1280;
      var h = ME.EDITOR.map.bitmapHeight || 800;
      addAnnotation({ text: text.trim(), position: [w / 2, h / 2] });
      modalEl.style.display = 'none';
      openManagerModal();
    };

    modalEl.querySelectorAll('.me-note-row').forEach(function(row){
      var id = row.getAttribute('data-note-id');
      function bind(sel, ev, fn){ var el = row.querySelector(sel); if (el) el.addEventListener(ev, fn); }

      bind('[data-note-text]',    'blur',    function(e){ updateAnnotation(id, { text: e.target.value }); });
      bind('[data-note-preset]',  'change',  function(e){
        var arr2 = ensureAnnotations();
        var note = arr2.find(function(a){ return a.id === id; });
        if (!note) return;
        ME.commitMutation('apply preset', function(){ applyPreset(note, e.target.value); });
        modalEl.style.display = 'none';
        openManagerModal();
      });
      bind('[data-note-scale]',   'change',  function(e){ updateAnnotation(id, { scaleMode: e.target.value, preset: 'custom' }); });
      bind('[data-note-size]',    'change',  function(e){ updateAnnotation(id, { fontSize: Number(e.target.value) || 16, preset: 'custom' }); });
      bind('[data-note-font]',    'change',  function(e){ updateAnnotation(id, { fontFamily: e.target.value, preset: 'custom' }); });
      bind('[data-note-color]',   'change',  function(e){ updateAnnotation(id, { color: e.target.value, preset: 'custom' }); });
      bind('[data-note-vert]',    'change',  function(e){ updateAnnotation(id, { vertical: !!e.target.checked, preset: 'custom' }); });
      bind('[data-note-italic]',  'change',  function(e){ updateAnnotation(id, { italic: !!e.target.checked, preset: 'custom' }); });
      bind('[data-note-bg]',      'change',  function(e){ updateAnnotation(id, { bgStyle: e.target.value, preset: 'custom' }); });
      bind('[data-note-bgcolor]', 'change',  function(e){ updateAnnotation(id, { bgColor: e.target.value, preset: 'custom' }); });
      bind('[data-note-div]',     'change',  function(e){ updateAnnotation(id, { divisionId: e.target.value }); });
      bind('[data-note-rot]',     'change',  function(e){ updateAnnotation(id, { rotation: Number(e.target.value) || 0 }); });
      bind('[data-note-est]',     'change',  function(e){
        var v = e.target.value === '' ? null : Number(e.target.value);
        updateAnnotation(id, { establishedYear: (isNaN(v) ? null : v) });
      });
      bind('[data-note-abo]',     'change',  function(e){
        var v = e.target.value === '' ? null : Number(e.target.value);
        updateAnnotation(id, { abolishedYear: (isNaN(v) ? null : v) });
      });
      bind('[data-note-del]',     'click',   function(){
        if (!confirm('删字注?')) return;
        removeAnnotation(id);
        modalEl.style.display = 'none';
        openManagerModal();
      });
    });
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.text = {
    createAnnotation: createAnnotation,
    applyPreset: applyPreset,
    addAnnotation: addAnnotation,
    removeAnnotation: removeAnnotation,
    updateAnnotation: updateAnnotation,
    listAnnotations: listAnnotations,
    renderLayer: renderLayer,
    handleClick: handleClick,
    handleDblClick: handleDblClick,
    hitTest: hitTest,
    startDrag: startDrag,
    dragTo: dragTo,
    endDrag: endDrag,
    updateHover: updateHover,
    clearHover: clearHover,
    openManagerModal: openManagerModal,
    init: init,
    PRESETS: PRESETS,
    FONT_FAMILIES: FONT_FAMILIES
  };

})(typeof window !== 'undefined' ? window : this);
