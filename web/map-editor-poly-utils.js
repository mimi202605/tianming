// map-editor-poly-utils.js
// 共享·polygon / 渲染 / 随机 helper·替散落重复
//
// 之前·至少 6 个模块复制 path-build / clip / strHash / srand 各自实现
// 此处统一·所有视觉模块走这套·refactor 入口
//
// 2026-05-08

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[poly-utils] core not loaded'); return; }

  // ─── ① path build·polygon → ctx.beginPath ────────────

  // 把 polygon 顶点序列描入 ctx 当前 path·调用方负责 fill / stroke / clip
  function tracePath(ctx, poly){
    if (!poly || poly.length < 3) return false;
    ctx.beginPath();
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (var i = 1; i < poly.length; i++){
      ctx.lineTo(poly[i][0], poly[i][1]);
    }
    ctx.closePath();
    return true;
  }

  // 将 polygon 当 sub-path 加到现有 path (不 beginPath·不 closePath 单独)
  // 用于 evenodd fill 多 ring 合一 path
  function appendSubPath(ctx, poly){
    if (!poly || poly.length < 3) return false;
    ctx.moveTo(poly[0][0], poly[0][1]);
    for (var i = 1; i < poly.length; i++){
      ctx.lineTo(poly[i][0], poly[i][1]);
    }
    ctx.closePath();
    return true;
  }

  // ─── ② 渲染 helper·clip 至 polygon 并执行 drawFn ─────

  // ctx.save → tracePath → clip → drawFn(ctx) → ctx.restore
  function withPolygonClip(ctx, poly, drawFn){
    if (!tracePath(ctx, poly)) return;
    ctx.save();
    ctx.clip();
    drawFn(ctx);
    ctx.restore();
  }

  // 遍历 visible cache·对每 div 的主 polygon 执行 fn(v, mainPoly)
  function forEachVisible(fn){
    var visible = (ME.EDITOR && ME.EDITOR._visibleCache) || [];
    for (var i = 0; i < visible.length; i++){
      var v = visible[i];
      var poly = v && v.allPolys && v.allPolys[0];
      if (poly && poly.length >= 3) fn(v, poly);
    }
  }

  // ─── ③ point-in-polygon·ray casting ─────────────────

  function pointInPolygon(x, y, poly){
    if (!poly || poly.length < 3) return false;
    var c = false;
    for (var i = 0, j = poly.length - 1; i < poly.length; j = i++){
      var pi = poly[i], pj = poly[j];
      if (((pi[1] > y) !== (pj[1] > y)) &&
          (x < (pj[0] - pi[0]) * (y - pi[1]) / (pj[1] - pi[1] + 1e-9) + pi[0])){
        c = !c;
      }
    }
    return c;
  }

  // ─── ④ 确定性·随机 / hash ─────────────────────────

  // 字符串 hash (32-bit)
  function strHash(s){
    var h = 0;
    if (!s) return 0;
    for (var i = 0; i < s.length; i++){
      h = ((h << 5) - h) + s.charCodeAt(i);
      h |= 0;
    }
    return Math.abs(h);
  }

  // seeded RNG·小型 LCG·返 0..1 floats
  function srand(seed){
    var s = (seed | 0) % 2147483647;
    if (s <= 0) s += 2147483646;
    return function(){
      s = (s * 16807) % 2147483647;
      return (s - 1) / 2147483646;
    };
  }

  // 按 div.id 取稳定 RNG·suffix 不同 → 不同序列
  function divRand(div, suffix){
    return srand(strHash((div && div.id || '') + ':' + (suffix || '')));
  }

  // ─── ⑤ 颜色 helper·hex / rgba ────────────────────────

  function hexToRgb(hex){
    if (!hex) return null;
    if (hex[0] === '#') hex = hex.slice(1);
    if (hex.length === 3){
      return [
        parseInt(hex[0] + hex[0], 16),
        parseInt(hex[1] + hex[1], 16),
        parseInt(hex[2] + hex[2], 16)
      ];
    }
    if (hex.length >= 6){
      return [
        parseInt(hex.slice(0, 2), 16),
        parseInt(hex.slice(2, 4), 16),
        parseInt(hex.slice(4, 6), 16)
      ];
    }
    return null;
  }

  function rgbaStr(rgb, a){
    return 'rgba(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ',' + a + ')';
  }

  // ─── ⑥ 通用 layer 模板·toggle / init / localStorage ─

  // 用法·替每个 layer 模块一坨样板代码
  // makeLayer({ name:'fog', defOn:false, hotkey:{ctrl:1,alt:1,key:'f'}, render: fn, ... })
  function makeLayer(spec){
    var enabled = !!spec.defOn;
    var key = 'me.' + (spec.storeKey || spec.name);

    // 读 localStorage·覆盖 default
    try {
      var v = localStorage.getItem(key);
      if (v === '1') enabled = true;
      else if (v === '0') enabled = false;
    } catch(e){}

    function isEnabled(){ return enabled; }
    function toggle(b){
      enabled = (b == null) ? !enabled : !!b;
      try { localStorage.setItem(key, enabled ? '1' : '0'); } catch(e){}
      ME.requestRender();
      if (spec.toastLabel && global.meToast){
        meToast(spec.toastLabel + '·' + (enabled ? '开' : '关'), 'info', 1200);
      }
    }

    function bindHotkey(){
      var hk = spec.hotkey;
      if (!hk) return;
      document.addEventListener('keydown', function(e){
        if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
        if (!!hk.ctrl !== e.ctrlKey) return;
        if (!!hk.alt !== e.altKey) return;
        if (!!hk.shift !== e.shiftKey) return;
        var k = (hk.key || '').toLowerCase();
        if (e.key.toLowerCase() !== k) return;
        e.preventDefault();
        toggle();
      });
    }

    return {
      isEnabled: isEnabled,
      toggle: toggle,
      bindHotkey: bindHotkey
    };
  }

  // ─── expose ────────────────────────────────────────────

  // P4·crop·Sutherland-Hodgman rectangle clip (winding-agnostic·pure coord compare)
  function _clipHalf(poly, inside, isect){
    if (!poly || poly.length === 0) return [];
    var out = [];
    for (var i = 0; i < poly.length; i++){
      var A = poly[i], B = poly[(i + 1) % poly.length];
      var Ain = inside(A), Bin = inside(B);
      if (Bin){ if (!Ain) out.push(isect(A, B)); out.push(B); }
      else if (Ain){ out.push(isect(A, B)); }
    }
    return out;
  }
  function _interpX(A, B, x){ var t = (x - A[0]) / ((B[0] - A[0]) || 1e-9); return [x, A[1] + t * (B[1] - A[1])]; }
  function _interpY(A, B, y){ var t = (y - A[1]) / ((B[1] - A[1]) || 1e-9); return [A[0] + t * (B[0] - A[0]), y]; }
  function clipPolygonToRect(poly, minX, minY, maxX, maxY){
    if (!poly || poly.length < 3) return [];
    var p = poly;
    p = _clipHalf(p, function(pt){ return pt[0] >= minX; }, function(A, B){ return _interpX(A, B, minX); });
    p = _clipHalf(p, function(pt){ return pt[0] <= maxX; }, function(A, B){ return _interpX(A, B, maxX); });
    p = _clipHalf(p, function(pt){ return pt[1] >= minY; }, function(A, B){ return _interpY(A, B, minY); });
    p = _clipHalf(p, function(pt){ return pt[1] <= maxY; }, function(A, B){ return _interpY(A, B, maxY); });
    return p;
  }

  // crop a whole division to a rect (main polygon + exclaves + holes); empty=主多边形被裁空
  function cropDivisionGeometry(div, minX, minY, maxX, maxY){
    var poly = clipPolygonToRect(div.polygon || [], minX, minY, maxX, maxY);
    var extras = [];
    if (div.extraPolygons){
      for (var i = 0; i < div.extraPolygons.length; i++){
        var e = clipPolygonToRect(div.extraPolygons[i], minX, minY, maxX, maxY);
        if (e.length >= 3) extras.push(e);
      }
    }
    var holes = [];
    if (div.holes){
      for (var h = 0; h < div.holes.length; h++){
        var hh = clipPolygonToRect(div.holes[h], minX, minY, maxX, maxY);
        if (hh.length >= 3) holes.push(hh);
      }
    }
    return { polygon: poly, extraPolygons: extras, holes: holes, empty: poly.length < 3 };
  }

  // line-vs-polygon crossings (unified·split preview + commit). eps = dedup distance (vertex-tangent dup skip).
  function findCrossings(poly, cutA, cutB, segIntFn, eps){
    var e2 = (eps || 0.5); e2 = e2 * e2;
    var arr = [];
    for (var i = 0; i < poly.length; i++){
      var hit = segIntFn(poly[i], poly[(i + 1) % poly.length], cutA, cutB);
      if (!hit) continue;
      var dup = false;
      for (var k = 0; k < arr.length; k++){
        var dx = arr[k].point[0] - hit.point[0];
        var dy = arr[k].point[1] - hit.point[1];
        if (dx*dx + dy*dy < e2){ dup = true; break; }
      }
      if (!dup) arr.push({ edgeIdx: i, t: hit.t1, point: hit.point });
    }
    return arr;
  }

  // Greiner-Hormann polygon boolean (intersection/difference·concave-capable). 退化(共边/共点)未处理·见单测。
  function _ghPip(pt, poly){ var x=pt[0],y=pt[1],inside=false,n=poly.length; for(var i=0,j=n-1;i<n;j=i++){var xi=poly[i][0],yi=poly[i][1],xj=poly[j][0],yj=poly[j][1]; if(((yi>y)!==(yj>y))&&(x<(xj-xi)*(y-yi)/(yj-yi)+xi))inside=!inside;} return inside; }
  function _ghRing(poly){ var head=null,prev=null; for(var i=0;i<poly.length;i++){var v={x:poly[i][0],y:poly[i][1],next:null,prev:null,inter:false,neighbour:null,entry:false,alpha:0,visited:false}; if(!head){head=v;prev=v;}else{prev.next=v;v.prev=prev;prev=v;}} prev.next=head;head.prev=prev; return head; }
  function _ghIns(a,b,v){ var cur=a; while(cur!==b&&cur.alpha<v.alpha)cur=cur.next; v.prev=cur.prev;v.next=cur;cur.prev.next=v;cur.prev=v; }
  function _ghIsect(p1,p2,q1,q2){ var x1=p1.x,y1=p1.y,x2=p2.x,y2=p2.y,x3=q1.x,y3=q1.y,x4=q2.x,y4=q2.y; var den=(x2-x1)*(y4-y3)-(y2-y1)*(x4-x3); if(Math.abs(den)<1e-12)return null; var t=((x3-x1)*(y4-y3)-(y3-y1)*(x4-x3))/den, u=((x3-x1)*(y2-y1)-(y3-y1)*(x2-x1))/den; if(t<=1e-12||t>=1-1e-12||u<=1e-12||u>=1-1e-12)return null; return {x:x1+t*(x2-x1),y:y1+t*(y2-y1),aP:t,aQ:u}; }
  // snap result vertices back to original subject/clip vertices (removes perturbation residue + collinear artifacts)
  function _ghSnapRing(ring, pts, tol){
    var out = ring.map(function(p){ var best=null, bd=tol*tol; for(var i=0;i<pts.length;i++){ var dx=pts[i][0]-p[0], dy=pts[i][1]-p[1], d=dx*dx+dy*dy; if(d<bd){bd=d; best=pts[i];} } return best?[best[0],best[1]]:p; });
    var dd=[]; for(var i=0;i<out.length;i++){ var q=out[(i+1)%out.length]; var dx=out[i][0]-q[0], dy=out[i][1]-q[1]; if(dx*dx+dy*dy>1e-9) dd.push(out[i]); }
    return dd.length>=3?dd:out;
  }
  // robust polygon boolean: tiny clip perturbation breaks shared-edge/vertex degeneracy, then snap back.
  function polygonBoolean(subject, clip, op){
    if(!subject||subject.length<3) return [];
    if(!clip||clip.length<3) return op==='diff'?[subject.slice()]:[];
    var E=1e-6; var pClip=clip.map(function(p){ return [p[0]+E, p[1]+E*0.6180339887]; });
    var res=_ghCore(subject, pClip, op);
    var pts=subject.concat(clip); var tol=1e-3;
    return res.map(function(r){ return r.outer?{outer:_ghSnapRing(r.outer,pts,tol),hole:_ghSnapRing(r.hole,pts,tol)}:_ghSnapRing(r,pts,tol); });
  }
  function _ghCore(subjectPoly, clipPoly, op){
    if(!subjectPoly||subjectPoly.length<3) return [];
    if(!clipPoly||clipPoly.length<3) return op==='diff'?[subjectPoly.slice()]:[];
    var S=_ghRing(subjectPoly), C=_ghRing(clipPoly), anyInter=false;
    var sv=S; do { var cv=C; do {
      var X=_ghIsect(sv,sv.next,cv,cv.next);
      if(X){ anyInter=true;
        var iS={x:X.x,y:X.y,inter:true,alpha:X.aP,visited:false,entry:false,next:null,prev:null,neighbour:null};
        var iC={x:X.x,y:X.y,inter:true,alpha:X.aQ,visited:false,entry:false,next:null,prev:null,neighbour:null};
        iS.neighbour=iC; iC.neighbour=iS; _ghIns(sv,sv.next,iS); _ghIns(cv,cv.next,iC);
      } cv=cv.next; } while(cv!==C); sv=sv.next; } while(sv!==S);
    if(!anyInter){
      var sIn=_ghPip(subjectPoly[0],clipPoly), cIn=_ghPip(clipPoly[0],subjectPoly);
      if(op==='int') return sIn?[subjectPoly.slice()] : (cIn?[clipPoly.slice()] : []);
      if(sIn) return [];
      if(cIn) return [{outer:subjectPoly.slice(), hole:clipPoly.slice()}];
      return [subjectPoly.slice()];
    }
    var status=_ghPip([S.x,S.y],clipPoly); var v=S; do { if(v.inter){v.entry=!status;status=!status;} v=v.next; } while(v!==S);
    var cStatus=(op==='diff')?!_ghPip([C.x,C.y],subjectPoly):_ghPip([C.x,C.y],subjectPoly);
    v=C; do { if(v.inter){v.entry=!cStatus;cStatus=!cStatus;} v=v.next; } while(v!==C);
    var result=[];
    function nextU(){ var v=S; do { if(v.inter&&!v.visited)return v; v=v.next; } while(v!==S); return null; }
    var start;
    while((start=nextU())){
      var ring=[]; var cur=start;
      do {
        cur.visited=true; if(cur.neighbour)cur.neighbour.visited=true;
        var fwd=(op==='diff')?!cur.entry:cur.entry;
        if(fwd){ do{cur=cur.next;ring.push([cur.x,cur.y]);}while(!cur.inter); }
        else  { do{cur=cur.prev;ring.push([cur.x,cur.y]);}while(!cur.inter); }
        cur.visited=true; cur=cur.neighbour;
      } while(cur&&cur!==start&&!cur.visited);
      if(ring.length>=3) result.push(ring);
      if(!cur) break;
    }
    return result;
  }

  // apply polygonBoolean to a division (largest ring=main·余=飞地·hole 情形→holes). 注:飞地未重裁。
  function divisionBooleanGeometry(div, clipPoly, op){
    var res = polygonBoolean(div.polygon || [], clipPoly, op);
    if(!res || !res.length) return { polygon: [], extraPolygons: [], holes: [], empty: true };
    if(res[0] && res[0].outer){
      var o = res[0].outer;
      return { polygon: o, extraPolygons: (div.extraPolygons||[]).slice(), holes: (div.holes||[]).concat([res[0].hole]), empty: o.length<3 };
    }
    function _a(p){ var s=0; for(var i=0;i<p.length;i++){var a=p[i],b=p[(i+1)%p.length]; s+=a[0]*b[1]-b[0]*a[1];} return Math.abs(s)/2; }
    var sorted = res.slice().sort(function(x,y){ return _a(y)-_a(x); });
    return { polygon: sorted[0], extraPolygons: (div.extraPolygons||[]).concat(sorted.slice(1)), holes: (div.holes||[]).slice(), empty: sorted[0].length<3 };
  }
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.polyUtils = {
    tracePath: tracePath,
    appendSubPath: appendSubPath,
    withPolygonClip: withPolygonClip,
    forEachVisible: forEachVisible,
    pointInPolygon: pointInPolygon,
    strHash: strHash,
    srand: srand,
    divRand: divRand,
    hexToRgb: hexToRgb,
    rgbaStr: rgbaStr,
    makeLayer: makeLayer,
    clipPolygonToRect: clipPolygonToRect,
    cropDivisionGeometry: cropDivisionGeometry,
    findCrossings: findCrossings,
    polygonBoolean: polygonBoolean,
    divisionBooleanGeometry: divisionBooleanGeometry
  };

})(typeof window !== 'undefined' ? window : this);
