// map-editor-player-view.js
// Phase 23.8·玩家显模式
//
// Ctrl+P 切·锁卷轴 preset (开 23.x ink + 关 21/22 CK3 风)·body.me-player-mode
// click 省 → 古绢小帖·显 行政区划 / 当主 / 出产
// 不动数据·只切 viz·退出还原
//
// 配 ink-mode flag·rivers 等他模块查 isInkMode()
//
// 2026-05-08

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[player-view] core not loaded'); return; }

  var _enabled = false;
  var _prevState = null;        // 保存上轮 toggle 状态·退还原
  var _popup = null;
  var _popupDiv = null;

  // ─── ink preset·开 / 还 ─────────────────────────────

  // 模块名 → toggle 函数 / 期望状态 (true / false / 'ink' style)
  // 玩家显·关编辑器视觉·留 Codex 底图 + 数据驱动着色
  var INK_PRESET = [
    ['climate',  'toggle',   false],   // 气候色 关 (Codex 底图自带气候色)
    ['season',   'toggle',   false],   // 季节 tint 关
    ['fog',      'toggle',   false],   // fog 关
    ['zoomBlend','toggle',   false],   // zoom-blend HUD 关
    ['inkRealm', 'toggle',   true],    // ★ 势力色 wash 开 (核心)
    ['borders',  'setStyle', 'ink']    // 边·切 ink 单线
  ];

  function snapshotState(){
    var s = {};
    INK_PRESET.forEach(function(p){
      var mod = TM.MapEditor[p[0]];
      if (!mod) return;
      if (p[1] === 'toggle' && mod.isEnabled){
        s[p[0]] = { kind: 'toggle', value: mod.isEnabled() };
      } else if (p[1] === 'setStyle' && mod.getStyle){
        s[p[0]] = { kind: 'setStyle', value: mod.getStyle() };
      }
    });
    return s;
  }

  function applyPreset(){
    INK_PRESET.forEach(function(p){
      var mod = TM.MapEditor[p[0]];
      if (!mod) return;
      if (p[1] === 'toggle' && mod.toggle){
        mod.toggle(p[2]);
      } else if (p[1] === 'setStyle' && mod.setStyle){
        mod.setStyle(p[2]);
      }
    });
  }

  function restoreState(s){
    if (!s) return;
    Object.keys(s).forEach(function(k){
      var mod = TM.MapEditor[k];
      if (!mod) return;
      var entry = s[k];
      if (entry.kind === 'toggle' && mod.toggle){
        mod.toggle(entry.value);
      } else if (entry.kind === 'setStyle' && mod.setStyle){
        mod.setStyle(entry.value);
      }
    });
  }

  // ─── enter / exit ──────────────────────────────────

  function enable(){
    if (_enabled) return;
    _prevState = snapshotState();
    _enabled = true;
    document.body.classList.add('me-player-mode');
    applyPreset();
    try { localStorage.setItem('me.playerView', '1'); } catch(e){}
    if (global.meToast) meToast('玩家显·卷轴模式·click 省看详', 'success', 2500);
    ME.requestRender();
  }

  function disable(){
    if (!_enabled) return;
    _enabled = false;
    document.body.classList.remove('me-player-mode');
    restoreState(_prevState);
    _prevState = null;
    closePopup();
    try { localStorage.setItem('me.playerView', '0'); } catch(e){}
    if (global.meToast) meToast('玩家显·关·返编辑', 'info', 1500);
    ME.requestRender();
  }

  function toggle(){
    if (_enabled) disable(); else enable();
  }

  // ─── popup·古绢小帖 ──────────────────────────────────

  function buildPopup(d){
    var typ = (d.autonomy && d.autonomy.type) || 'zhixia';
    var typeLabel = ({zhixia:'直辖', fanguo:'藩国', fanzhen:'藩镇', jimi:'羁縻', chaogong:'朝贡'})[typ] || typ;
    var typeColor = ({
      zhixia: '#3d4f6a', fanguo: '#8a3a2e', fanzhen: '#b65a30',
      jimi: '#6a8a3a', chaogong: '#7a6a3a'
    })[typ] || '#5a5048';

    // 行政区划链
    var crumb = [];
    if (d.region) crumb.push(d.region);
    if (d.regionType && d.regionType !== d.region) crumb.push(d.regionType);
    if (d.level) crumb.push(d.level);
    var crumbStr = crumb.join(' · ') || '(无 region)';

    // 当主
    var holder = d.autonomy && d.autonomy.holder;
    var holderStr = holder ? holder : '(中央)';
    if (typ === 'fanguo' && d.autonomy.subtype){
      holderStr += d.autonomy.subtype === 'real' ? ' (实封)' : ' (虚封)';
    }

    // Phase 25.6·属·势力 (faction)
    var faction = null;
    if (TM.MapEditor.factions && d.factionId){
      faction = TM.MapEditor.factions.get(d.factionId);
    }

    // 人口·出产 (如有)
    var pop = d.population != null ? Number(d.population).toLocaleString() : null;
    var prod = d.specialResources || d.products || null;

    // climate / terrain (若已分)
    var climate = TM.MapEditor.climate && TM.MapEditor.climate.classify ? TM.MapEditor.climate.classify(d) : null;
    var terrain = TM.MapEditor.terrain && TM.MapEditor.terrain.classify ? TM.MapEditor.terrain.classify(d) : null;

    var html = ''
      + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:8px;">'
      +   '<div>'
      +     '<div style="font-size:18px;font-weight:600;color:#3a2818;font-family:serif;letter-spacing:0.06em;">' + escHtml(d.name || '(无名)') + '</div>'
      +     '<div style="font-size:11px;color:#7a5a3a;margin-top:2px;font-style:italic;">' + escHtml(crumbStr) + '</div>'
      +   '</div>'
      +   '<button id="me-pv-close" style="border:0;background:transparent;font-size:16px;color:#8a6a4a;cursor:pointer;padding:0 4px;line-height:1;">×</button>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;font-size:12px;flex-wrap:wrap;">'
      +   '<span style="display:inline-block;padding:2px 8px;background:' + typeColor + ';color:#f5e8c8;border-radius:2px;font-size:11px;letter-spacing:0.08em;">' + escHtml(typeLabel) + '</span>'
      +   '<span style="color:#5a4028;">主·' + escHtml(holderStr) + '</span>'
      + '</div>';

    // Phase 25.6·势力一行·旗色 + 名 + desc
    if (faction){
      html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;padding:5px 8px;background:rgba(120,90,50,0.08);border-left:3px solid ' + escHtml(faction.color) + ';border-radius:2px;">'
        + '<span style="display:inline-block;width:14px;height:14px;background:' + escHtml(faction.color) + ';border:1px solid rgba(0,0,0,0.3);"></span>'
        + '<span style="color:#3a2818;font-size:12px;">属·<b>' + escHtml(faction.name) + '</b>'
        + (faction.desc ? '<span style="color:#7a5a3a;font-style:italic;font-size:11px;margin-left:4px;">' + escHtml(faction.desc) + '</span>' : '')
        + '</span>'
        + '</div>';
    }

    html += '<div style="border-top:1px dashed rgba(120,90,50,0.35);margin:8px 0;"></div>'
      + '<div style="font-size:12px;color:#3a2818;line-height:1.65;">';

    if (terrain) html += '<div>地形·<span style="color:#5a4028;">' + escHtml(terrain) + '</span></div>';
    if (climate) html += '<div>气候·<span style="color:#5a4028;">' + escHtml(climate) + '</span></div>';
    if (pop)     html += '<div>人口·<span style="color:#5a4028;">' + escHtml(pop) + '</span></div>';
    if (prod)    html += '<div>出产·<span style="color:#5a4028;">' + escHtml(prod) + '</span></div>';
    if (d.id)    html += '<div style="margin-top:6px;font-size:10px;color:#9a7a5a;font-family:monospace;">id·' + escHtml(d.id) + '</div>';

    html += '</div>';
    return html;
  }

  function escHtml(s){
    if (s == null) return '';
    return String(s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  function ensurePopup(){
    if (_popup) return _popup;
    _popup = document.createElement('div');
    _popup.id = 'me-player-popup';
    _popup.style.cssText = ''
      + 'position:fixed;z-index:9000;display:none;'
      + 'background:linear-gradient(180deg,#f4e3bc 0%,#e8d3a0 100%);'
      + 'border:1px solid rgba(80,55,30,0.55);'
      + 'box-shadow:0 8px 24px rgba(40,25,10,0.45),inset 0 0 30px rgba(180,140,90,0.25);'
      + 'border-radius:3px;'
      + 'padding:14px 18px;'
      + 'min-width:240px;max-width:340px;'
      + 'font-family:serif;'
      + 'color:#3a2818;';
    document.body.appendChild(_popup);
    return _popup;
  }

  function showPopup(d, screenX, screenY){
    _popupDiv = d;
    var p = ensurePopup();
    p.innerHTML = buildPopup(d);
    p.style.display = 'block';
    // 定位·screenX/Y 略偏右下·避边界
    var w = p.offsetWidth, h = p.offsetHeight;
    var winW = window.innerWidth, winH = window.innerHeight;
    var x = screenX + 14, y = screenY + 14;
    if (x + w > winW - 10) x = screenX - w - 14;
    if (y + h > winH - 10) y = screenY - h - 14;
    if (x < 4) x = 4;
    if (y < 4) y = 4;
    p.style.left = x + 'px';
    p.style.top  = y + 'px';

    var btn = document.getElementById('me-pv-close');
    if (btn){
      btn.onclick = closePopup;
    }
  }

  function closePopup(){
    if (_popup){
      _popup.style.display = 'none';
    }
    _popupDiv = null;
  }

  function onCanvasClick(e){
    if (!_enabled) return;
    var canvas = ME.EDITOR.canvas;
    var rect = canvas.getBoundingClientRect();
    var sx = e.clientX - rect.left;
    var sy = e.clientY - rect.top;
    var z = ME.EDITOR.camera.zoom;
    var wx = (sx - ME.EDITOR.camera.x) / z;
    var wy = (sy - ME.EDITOR.camera.y) / z;
    var divs = ME.EDITOR.map.divisions || [];
    var hit = null;
    for (var i = 0; i < divs.length; i++){
      if (ME.pointInDivision && ME.pointInDivision(wx, wy, divs[i])){
        hit = divs[i]; break;
      }
    }
    if (hit){
      showPopup(hit, e.clientX, e.clientY);
    } else {
      closePopup();
    }
  }

  // ─── isInkMode·rivers 等模块查 ─────────────────────

  function isInkMode(){ return _enabled; }

  // ─── init ──────────────────────────────────────────────

  function init(){
    try {
      var v = localStorage.getItem('me.playerView');
      if (v === '1'){
        // 延后一帧·等其他模块 init
        setTimeout(function(){ enable(); }, 80);
      }
    } catch(e){}

    document.addEventListener('keydown', function(e){
      if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT')) return;
      // Ctrl+Alt+P·进 / 出 玩家显
      if (e.ctrlKey && e.altKey && (e.key === 'p' || e.key === 'P')){
        e.preventDefault();
        toggle();
      }
      if (e.key === 'Escape' && _enabled && _popup && _popup.style.display === 'block'){
        closePopup();
      }
    });

    var canvas = ME.EDITOR.canvas;
    if (canvas){
      // 普通 click·player mode 时弹 popup·非 player mode 不动
      canvas.addEventListener('click', function(e){
        // 不 capture·让 normal click select 走完
        // 只 player mode 时·额外弹 popup
        if (_enabled){
          // 略延 (等 normal handler 走完)
          setTimeout(function(){ onCanvasClick(e); }, 0);
        }
      });
    }

    // 注·样式·body.me-player-mode 隐编辑栏 (CSS 在 HTML 里)
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.playerView = {
    init: init,
    enable: enable,
    disable: disable,
    toggle: toggle,
    isEnabled: function(){ return _enabled; },
    isInkMode: isInkMode,
    closePopup: closePopup
  };

})(typeof window !== 'undefined' ? window : this);
