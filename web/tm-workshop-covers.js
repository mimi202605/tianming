// 运行时工坊封面：剪纸/水墨无字场景图 + 汉字 DOM overlay（path-A，守"扩散画不出汉字"）。
// 由 tm-content-manager 在 render() 后调用 TMWorkshopCovers.enhance(root) 增强 .tm-cover。
// 卡片只放 data-glyph(首字) / data-official / data-ptype(类型)；场景与漆色由本模块注入。
// 类型感知：剧本→朝代场景；立绘→人物龛；配乐→琴瑟；地图→舆图；MOD→机括。
(function(){
  'use strict';
  var D1='rgba(8,5,3,.62)', D2='rgba(18,11,7,.46)', D3='rgba(30,18,11,.30)';
  var GOLD='rgba(243,218,146,.88)', GOLDdim='rgba(214,177,93,.5)', RIM='rgba(255,238,184,.55)';
  var WATER='rgba(40,90,110,.5)';
  // 带月相框（夜景）
  function svg(inner, dx, dy){
    var disc = '<circle cx="'+(dx==null?92:dx)+'" cy="'+(dy==null?22:dy)+'" r="13" fill="'+GOLD+'"/>'
             + '<circle cx="'+(dx==null?92:dx)+'" cy="'+(dy==null?22:dy)+'" r="13" fill="none" stroke="'+RIM+'" stroke-width=".6"/>';
    return wrap(disc + inner);
  }
  // 无月相框（昼景/题材图）
  function plain(inner){ return wrap(inner); }
  function wrap(inner){
    return '<svg class="scene" viewBox="0 0 120 90" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">' + inner + '</svg>';
  }
  function hills(){
    return '<path d="M0,70 Q20,58 38,66 T78,62 T120,68 V90 H0 Z" fill="'+D3+'"/>'
         + '<path d="M0,77 Q26,66 50,74 T96,70 T120,76 V90 H0 Z" fill="'+D2+'"/>';
  }
  // ===== 朝代场景（剧本类） =====
  var SCENES = {
    gong: function(){ return svg(hills()
      + '<g fill="'+D1+'"><rect x="46" y="58" width="28" height="22"/><rect x="40" y="78" width="40" height="12"/><path d="M44,58 L60,46 L76,58 Z"/><rect x="56" y="66" width="8" height="14" fill="rgba(243,218,146,.25)"/></g>'
      + '<path d="M44,57 L60,45 L76,57" fill="none" stroke="'+GOLDdim+'" stroke-width=".8"/>', 96, 20); },
    chao: function(){ return svg('<g fill="'+D2+'"><path d="M0,40 Q14,33 30,40 Q44,46 60,40 Q76,33 92,40 Q108,46 120,40 V52 H0 Z"/></g>'
      + '<g fill="'+D1+'"><path d="M0,62 Q16,53 34,62 Q52,70 70,62 Q90,53 108,62 Q116,66 120,64 V90 H0 Z"/><rect x="20" y="74" width="6" height="16"/><rect x="54" y="74" width="6" height="16"/><rect x="92" y="74" width="6" height="16"/></g>'
      + '<path d="M0,62 Q16,53 34,62 Q52,70 70,62 Q90,53 108,62" fill="none" stroke="'+GOLDdim+'" stroke-width=".8"/>', 98, 18); },
    bian: function(){ return svg('<path d="M0,78 L22,50 L40,72 L58,44 L78,72 L96,52 L120,78 V90 H0 Z" fill="'+D2+'"/>'
      + '<path d="M0,82 L26,60 L48,80 L70,58 L94,80 L120,66 V90 H0 Z" fill="'+D1+'"/>'
      + '<path d="M14,52 L22,50 L30,58 M50,46 L58,44 L66,54 M88,54 L96,52 L104,60" fill="none" stroke="'+RIM+'" stroke-width=".7"/>'
      + '<g fill="'+D1+'"><rect x="98" y="44" width="8" height="20"/><rect x="96" y="40" width="12" height="5"/></g>'
      + '<path d="M101,40 q3,-6 0,-10 q-3,4 0,10" fill="rgba(214,120,80,.7)"/>', 26, 24); },
    cheng: function(){ return svg(hills()
      + '<g fill="'+D1+'"><path d="M0,66 H120 V90 H0 Z"/><rect x="6" y="60" width="7" height="6"/><rect x="22" y="60" width="7" height="6"/><rect x="38" y="60" width="7" height="6"/><rect x="54" y="60" width="7" height="6"/><rect x="70" y="60" width="7" height="6"/><rect x="86" y="60" width="7" height="6"/><rect x="102" y="60" width="7" height="6"/></g>'
      + '<g stroke="'+D1+'" stroke-width="1.4"><line x1="30" y1="60" x2="30" y2="40"/><line x1="78" y1="60" x2="78" y2="44"/></g>'
      + '<path d="M30,40 l12,4 l-12,4 Z" fill="rgba(193,80,59,.85)"/><path d="M78,44 l11,4 l-11,4 Z" fill="rgba(193,80,59,.7)"/>', 100, 18); },
    shan: function(){ return svg('<path d="M0,54 Q18,40 36,52 Q54,62 72,50 Q92,38 120,52 V64 H0 Z" fill="'+D3+'"/>'
      + '<path d="M0,64 Q22,52 44,62 Q66,70 90,60 Q108,52 120,60 V72 H0 Z" fill="'+D2+'"/>'
      + '<rect x="0" y="74" width="120" height="16" fill="rgba(40,70,80,.4)"/><path d="M0,74 H120" stroke="'+GOLDdim+'" stroke-width=".5"/>'
      + '<g fill="'+D1+'"><path d="M48,74 L48,64 L58,74 Z"/><rect x="47" y="74" width="12" height="3"/></g>', 96, 22); },
    zhan: function(){ return svg(hills()
      + '<g stroke="'+D1+'" stroke-width="1.3"><line x1="14" y1="78" x2="14" y2="48"/><line x1="30" y1="80" x2="30" y2="52"/><line x1="46" y1="78" x2="46" y2="46"/><line x1="62" y1="80" x2="62" y2="50"/><line x1="78" y1="78" x2="78" y2="44"/><line x1="94" y1="80" x2="94" y2="50"/><line x1="108" y1="78" x2="108" y2="48"/></g>'
      + '<g fill="rgba(193,80,59,.8)"><path d="M14,48 l9,3 l-9,3 Z"/><path d="M46,46 l9,3 l-9,3 Z"/><path d="M78,44 l9,3 l-9,3 Z"/><path d="M108,48 l9,3 l-9,3 Z"/></g>'
      + '<g fill="rgba(214,177,93,.5)"><path d="M30,52 l8,3 l-8,3 Z"/><path d="M62,50 l8,3 l-8,3 Z"/><path d="M94,50 l8,3 l-8,3 Z"/></g>'
      + '<path d="M0,80 H120 V90 H0 Z" fill="'+D1+'"/>', 98, 18); },
    yuan: function(){ return svg(hills() + '<path d="M0,82 Q30,72 60,80 T120,80 V90 H0 Z" fill="'+D1+'"/>'
      + '<path d="M30,26 q5,-4 10,0 q5,-4 10,0" fill="none" stroke="rgba(236,225,205,.5)" stroke-width=".8"/>', 94, 20); }
  };
  // ===== 题材场景（按内容类型） =====
  var TYPE_SCENES = {
    // 立绘：人物龛（顶幔 + 立柱 + 基座肩影），字置其中如供奉画像
    portrait: function(){ return plain(
        '<path d="M22,16 H98 L90,27 H30 Z" fill="'+D2+'"/>'
      + '<path d="M22,16 H98" stroke="'+GOLDdim+'" stroke-width=".9"/>'
      + '<rect x="24" y="27" width="5" height="58" fill="'+D1+'"/><rect x="91" y="27" width="5" height="58" fill="'+D1+'"/>'
      + '<path d="M29,90 Q30,67 60,62 Q90,67 91,90 Z" fill="'+D2+'"/>'
      + '<path d="M43,90 Q46,73 60,71 Q74,73 77,90" fill="none" stroke="'+GOLDdim+'" stroke-width=".6"/>'
      + '<circle cx="60" cy="60" r="6" fill="'+D1+'"/>'); },
    // 配乐：夜阑琴瑟（琴身横陈 + 浮云乐符）
    music: function(){ return svg(hills()
      + '<path d="M10,76 Q60,68 110,76 L107,86 Q60,79 13,86 Z" fill="'+D1+'"/>'
      + '<g stroke="'+GOLDdim+'" stroke-width=".5" fill="none"><path d="M16,78 Q60,71 104,78"/><path d="M16,80.5 Q60,73.5 104,80.5"/><path d="M16,83 Q60,76 104,83"/></g>'
      + '<g fill="'+GOLD+'"><circle cx="40" cy="36" r="2.3"/><circle cx="78" cy="30" r="2.3"/></g>'
      + '<g stroke="'+GOLD+'" stroke-width=".9" fill="none"><path d="M42,36 V25"/><path d="M80,30 V19"/><path d="M42,25 q5,-1 6,3" /><path d="M80,19 q5,-1 6,3"/></g>', 100, 20); },
    // 地图：舆图卷（虚线疆界 + 等高线 + 江河 + 罗盘）
    map: function(){ return plain(
        '<rect x="9" y="11" width="102" height="68" fill="none" stroke="'+GOLDdim+'" stroke-width=".7" stroke-dasharray="3 2.4"/>'
      + '<g fill="none" stroke="'+D1+'" stroke-width="1"><path d="M16,42 Q34,32 52,40 Q72,50 92,40 Q102,36 106,42"/><path d="M14,56 Q36,48 56,56 Q76,64 104,54"/></g>'
      + '<path d="M30,14 Q40,42 32,78" fill="none" stroke="'+WATER+'" stroke-width="1.5"/>'
      + '<path d="M86,14 Q80,46 92,78" fill="none" stroke="rgba(40,90,110,.4)" stroke-width="1.2"/>'
      + '<g transform="translate(97,23)"><path d="M0,-8 L2.2,0 L0,8 L-2.2,0 Z" fill="'+GOLD+'"/><path d="M-8,0 L0,-2.2 L8,0 L0,2.2 Z" fill="'+GOLDdim+'"/></g>'); },
    // MOD：机括砖作（齿轮双环 + 砖基），喻"改建/扩展"
    mod: function(){ return plain(
        '<g fill="'+D1+'"><rect x="8" y="74" width="104" height="14"/></g>'
      + '<g stroke="'+D2+'" stroke-width="1.1"><line x1="34" y1="74" x2="34" y2="88"/><line x1="64" y1="74" x2="64" y2="88"/><line x1="94" y1="74" x2="94" y2="88"/><line x1="20" y1="81" x2="49" y2="81"/><line x1="79" y1="81" x2="108" y2="81"/></g>'
      + '<g fill="none" stroke="'+GOLDdim+'" stroke-width="1.4"><circle cx="42" cy="34" r="15"/><circle cx="42" cy="34" r="6"/></g>'
      + '<g stroke="'+GOLDdim+'" stroke-width="2"><line x1="42" y1="15" x2="42" y2="22"/><line x1="42" y1="46" x2="42" y2="53"/><line x1="23" y1="34" x2="30" y2="34"/><line x1="54" y1="34" x2="61" y2="34"/><line x1="28" y1="20" x2="33" y2="25"/><line x1="51" y1="43" x2="56" y2="48"/><line x1="51" y1="25" x2="56" y2="20"/><line x1="28" y1="48" x2="33" y2="43"/></g>'
      + '<g fill="none" stroke="'+RIM+'" stroke-width="1.1"><circle cx="80" cy="46" r="9"/><circle cx="80" cy="46" r="3.5"/></g>'); }
  };
  var MAP = { '启':'chao','崇':'chao','嘉':'chao','甲':'zhan','安':'zhan','贞':'gong','开':'gong','永':'gong','洪':'gong','武':'gong','万':'bian','宁':'bian','靖':'cheng','守':'cheng','宋':'shan','绍':'shan','淳':'shan','江':'shan' };
  var DYN_POOL = ['gong','chao','bian','cheng','shan','zhan','yuan'];
  var TONES = ['zhu','dai','jin','zhe','mo','jiang','qing'];
  // 剧本类：先查专名映射，未命中按 charCode 分流到 7 种场景（避免全落 yuan 同质化）
  function dynastScene(glyph){
    if (MAP[glyph]) return SCENES[MAP[glyph]];
    var c = glyph ? glyph.charCodeAt(0) : 0;
    return SCENES[DYN_POOL[c % DYN_POOL.length]];
  }
  function sceneFor(glyph, type){
    type = String(type || 'scenario');
    if (TYPE_SCENES[type]) return TYPE_SCENES[type];
    return dynastScene(glyph);
  }
  function toneFor(glyph){ var c = glyph ? glyph.charCodeAt(0) : 0; return TONES[c % TONES.length]; }
  function enhance(root){
    var nodes = (root || document).querySelectorAll('.tm-cover');
    for (var i = 0; i < nodes.length; i++) {
      var el = nodes[i];
      if (el.__tmCoverDone) continue; el.__tmCoverDone = true;
      var glyph = el.getAttribute('data-glyph') || (el.textContent || '').trim().charAt(0) || '坊';
      var official = el.getAttribute('data-official') === '1';
      var typeLabel = el.getAttribute('data-type-label') || '';
      var ptype = el.getAttribute('data-ptype') || 'scenario';
      el.textContent = '';
      el.classList.add(toneFor(glyph));
      el.insertAdjacentHTML('afterbegin', sceneFor(glyph, ptype)()
        + (official ? '<span class="tm-official">官方</span>' : '')
        + (typeLabel ? '<span class="tm-ptype">' + typeLabel + '</span>' : '')
        + '<span class="tm-cover-glyph">' + glyph + '</span>');
    }
  }
  // 直接产出封面内层（场景SVG + 字印），供全屏商城内联使用（不走 enhance 后处理）。
  function coverInner(glyph, opts) {
    glyph = (glyph || '坊').toString().trim().charAt(0) || '坊';
    opts = opts || {};
    return sceneFor(glyph, opts.type)()
      + (opts.official ? '<span class="official">官方</span>' : '')
      + (opts.typeLabel ? '<span class="ptype">' + opts.typeLabel + '</span>' : '')
      + '<span class="glyph">' + glyph + '</span>';
  }
  window.TMWorkshopCovers = {
    enhance: enhance, coverInner: coverInner, tone: toneFor,
    sceneSVG: function(g, type){ return sceneFor((g || '坊').toString().trim().charAt(0) || '坊', type)(); }
  };
})();
