// map-editor-ui.js
// Phase 15.5·command palette + cheatsheet + toast
// 三套 overlay UI·均通过键盘触发·Esc 关
//
// 1. Cmd+K / Ctrl+K · command palette·搜 + 跳工具/触发按钮
// 2. ? · cheatsheet · 全热键 + 工具一表
// 3. window.meToast(msg, type) · 替代 alert / status-tip 喷涂
//
// 2026-05-06

(function(global){
  'use strict';

  // ════════════════════════════════════════════════════════════════
  // ① command palette
  // ════════════════════════════════════════════════════════════════

  var paletteEl = null;
  var paletteInput = null;
  var paletteList = null;
  var paletteVisible = false;
  var paletteHotIdx = 0;

  function createPalette(){
    if (paletteEl) return paletteEl;
    paletteEl = document.createElement('div');
    paletteEl.className = 'me-palette';
    paletteEl.style.cssText = 'position:fixed; left:50%; top:18%; transform:translateX(-50%); z-index:3000; width:520px; max-width:92vw; background:linear-gradient(180deg, var(--ink-3), var(--ink-2)); border:1px solid var(--bd-1); border-radius:var(--rd-4); box-shadow:var(--sh-3); display:none; overflow:hidden; font-family:var(--font-serif);';
    paletteEl.innerHTML =
      '<div style="display:flex; align-items:center; gap:var(--sp-2); padding:var(--sp-3) var(--sp-4); border-bottom:1px solid var(--bd-1); background:var(--ink-3);">' +
        '<span style="font-size:var(--fs-md); color:var(--gold-2);">⌘</span>' +
        '<input id="me-palette-input" type="text" placeholder="搜命令、工具、按钮..." ' +
          'style="flex:1; background:transparent; border:none; outline:none; color:var(--paper-0); font-family:var(--font-serif); font-size:var(--fs-md); letter-spacing:0.04em;" />' +
        '<span style="color:var(--paper-3); font-size:var(--fs-xxs); font-family:var(--font-mono);">Esc 关</span>' +
      '</div>' +
      '<div id="me-palette-list" style="max-height:50vh; overflow-y:auto; padding:var(--sp-1) 0;"></div>' +
      '<div style="padding:6px var(--sp-3); border-top:1px solid var(--bd-1); background:var(--ink-3); font-size:var(--fs-xxs); color:var(--paper-3); display:flex; gap:var(--sp-3);">' +
        '<span><kbd>↑↓</kbd> 选</span><span><kbd>↵</kbd> 触发</span><span><kbd>Esc</kbd> 关</span>' +
      '</div>';
    document.body.appendChild(paletteEl);
    paletteInput = paletteEl.querySelector('#me-palette-input');
    paletteList = paletteEl.querySelector('#me-palette-list');

    paletteInput.addEventListener('input', function(){ refreshList(); });
    paletteInput.addEventListener('keydown', function(e){
      if (e.key === 'ArrowDown'){ e.preventDefault(); moveHot(1); }
      else if (e.key === 'ArrowUp'){ e.preventDefault(); moveHot(-1); }
      else if (e.key === 'Enter'){ e.preventDefault(); triggerHot(); }
      else if (e.key === 'Escape'){ e.preventDefault(); hidePalette(); }
    });
    return paletteEl;
  }

  function collectCommands(){
    var cmds = [];
    // 1. tools
    document.querySelectorAll('.me-tool[data-tool]').forEach(function(b){
      var glyph = b.querySelector('.me-tool-glyph');
      var key = b.querySelector('.me-tk');
      cmds.push({
        type: 'tool',
        label: (glyph ? glyph.textContent : '') + ' · 工具·' + (b.title || b.getAttribute('data-tool')),
        keys: key ? key.textContent : '',
        action: function(){ b.click(); }
      });
    });
    // 2. menu / drawer / minibar buttons
    document.querySelectorAll('.me-mbtn[id], .me-btn[id]').forEach(function(b){
      var label = (b.textContent || '').trim();
      if (!label) return;
      cmds.push({
        type: 'btn',
        label: label + (b.title ? ' · ' + b.title : ''),
        keys: '',
        action: function(){ b.click(); }
      });
    });
    // 3. drawer tabs
    document.querySelectorAll('.me-dtab').forEach(function(t){
      cmds.push({
        type: 'tab',
        label: '切·drawer·' + t.textContent,
        keys: '',
        action: function(){ t.click(); }
      });
    });
    // 4. layer toggles
    document.querySelectorAll('input[data-layer]').forEach(function(cb){
      var labelEl = cb.parentElement;
      var label = (labelEl ? labelEl.textContent : '').trim();
      cmds.push({
        type: 'layer',
        label: '层·' + label + '·' + (cb.checked ? '已开' : '已关'),
        keys: '',
        action: function(){
          cb.checked = !cb.checked;
          cb.dispatchEvent(new Event('change', { bubbles: true }));
        }
      });
    });
    return cmds;
  }

  function fuzzyMatch(text, query){
    if (!query) return true;
    var t = text.toLowerCase();
    var q = query.toLowerCase();
    var ti = 0, qi = 0;
    while (ti < t.length && qi < q.length){
      if (t[ti] === q[qi]) qi++;
      ti++;
    }
    return qi === q.length;
  }

  function refreshList(){
    var q = paletteInput.value.trim();
    var cmds = collectCommands().filter(function(c){
      return fuzzyMatch(c.label, q);
    });
    paletteHotIdx = 0;
    paletteList.innerHTML = cmds.slice(0, 30).map(function(c, i){
      return '<div class="me-pl-row" data-i="' + i + '" style="display:flex; align-items:center; gap:var(--sp-2); padding:var(--sp-2) var(--sp-4); cursor:pointer; font-size:var(--fs-sm); color:var(--paper-1); border-bottom:1px solid var(--bd-2);">' +
        '<span style="display:inline-block; min-width:32px; font-size:var(--fs-xxs); color:var(--paper-3); text-transform:uppercase; letter-spacing:0.1em;">' + c.type + '</span>' +
        '<span style="flex:1;">' + escHtml(c.label) + '</span>' +
        (c.keys ? '<kbd>' + c.keys + '</kbd>' : '') +
      '</div>';
    }).join('') || '<div style="padding:var(--sp-4); color:var(--paper-3); text-align:center;">无匹配</div>';
    var rows = paletteList.querySelectorAll('.me-pl-row');
    rows.forEach(function(r, i){
      r.addEventListener('click', function(){ paletteHotIdx = i; triggerHot(); });
      r.addEventListener('mouseenter', function(){ paletteHotIdx = i; updateHot(); });
    });
    updateHot();
  }
  function moveHot(d){
    var rows = paletteList.querySelectorAll('.me-pl-row');
    if (!rows.length) return;
    paletteHotIdx = (paletteHotIdx + d + rows.length) % rows.length;
    updateHot();
  }
  function updateHot(){
    var rows = paletteList.querySelectorAll('.me-pl-row');
    rows.forEach(function(r, i){
      var hot = i === paletteHotIdx;
      r.style.background = hot ? 'var(--ink-4)' : '';
      r.style.color = hot ? 'var(--gold-1)' : 'var(--paper-1)';
      if (hot) r.scrollIntoView({ block: 'nearest' });
    });
  }
  function triggerHot(){
    var q = paletteInput.value.trim();
    var cmds = collectCommands().filter(function(c){ return fuzzyMatch(c.label, q); });
    var c = cmds[paletteHotIdx];
    if (!c) return;
    hidePalette();
    setTimeout(c.action, 50);
  }

  function showPalette(){
    createPalette();
    paletteEl.style.display = 'block';
    paletteInput.value = '';
    paletteVisible = true;
    refreshList();
    setTimeout(function(){ paletteInput.focus(); }, 30);
  }
  function hidePalette(){
    if (paletteEl) paletteEl.style.display = 'none';
    paletteVisible = false;
  }

  // ════════════════════════════════════════════════════════════════
  // ② cheatsheet
  // ════════════════════════════════════════════════════════════════

  var cheatEl = null;
  var cheatVisible = false;

  function createCheatsheet(){
    if (cheatEl) return cheatEl;
    cheatEl = document.createElement('div');
    cheatEl.className = 'me-cheat';
    cheatEl.style.cssText = 'position:fixed; left:50%; top:50%; transform:translate(-50%, -50%); z-index:3000; width:760px; max-width:94vw; max-height:84vh; overflow-y:auto; background:linear-gradient(180deg, var(--ink-3), var(--ink-2)); border:1px solid var(--bd-1); border-radius:var(--rd-4); box-shadow:var(--sh-3); display:none; font-family:var(--font-serif); padding:var(--sp-5);';
    cheatEl.innerHTML = renderCheat();
    document.body.appendChild(cheatEl);
    cheatEl.addEventListener('click', function(e){
      if (e.target === cheatEl || e.target.classList.contains('me-cheat-close')){
        hideCheat();
      }
    });
    return cheatEl;
  }

  function renderCheat(){
    var sections = [
      { t: '工具·rail (单键切换)', items: [
        ['V', '选省'], ['P', '画省'], ['E', '编顶点'], ['H', '拖图'], ['Z', '缩放'],
        ['M', '合并选省'], ['S', '切线'], ['+', '加飞地'], ['○', '加圈洞'], ['B', '圆刷'],
        ['T', '字注'], ['R', '河网'], ['D', '道路'], ['G', '要塞'], ['F', '渡口'],
        ['I', '吸管'], ['U', '高程画笔'], ['Y', '地形画笔'], ['A', 'AI 推默认']
      ]},
      { t: '导航·画布', items: [
        ['空格 + 拖', '拖图'], ['滚轮', '缩放'], ['0', '居中'], ['Tab', '收 / 展开 drawer'],
        ['Ctrl+Z', '撤销'], ['Ctrl+Y', '重做'], ['Esc', '取消当前操作 / 选'],
        ['Del', '删除选中']
      ]},
      { t: '选 (V 工具)', items: [
        ['click 省', '单选'], ['Shift + click', '加 / 减'],
        ['drag 空地', '矩形框选'], ['hold L + drag', '套索圈选'],
        ['Shift + drag', '加选'], ['Ctrl + drag', 'toggle 选'], ['Alt + drag', '减选'],
        ['Ctrl+A', '全选'], ['Ctrl+I', '反选']
      ]},
      { t: '画省 (P 工具)', items: [
        ['click', '加顶点'],
        ['近首点 click', '闭合·新建省'],
        ['Esc', '取消当前 pen']
      ]},
      { t: '编顶点 (E 工具)', items: [
        ['drag 顶点', '移动'],
        ['Alt + click 边', '中点插入'],
        ['Shift + click 顶点', '删除']
      ]},
      { t: '圆刷 (B 工具)', items: [
        ['drag 画', '加 / 减区域'],
        ['[ / ]', '改尺寸'],
        ['A / S', '加 / 减切换'],
        ['Shift+滚轮', '快速改尺寸'],
        ['Enter', '提交·退出'],
        ['Esc', '退出·不提交']
      ]},
      { t: '河 / 道 / 渡 (R/D/F)', items: [
        ['click', '加点'],
        ['双击 / Enter', '完成'],
        ['Esc', '取消'],
        ['drag 顶点', '移动 (选中时)'],
        ['Alt + click 边', '插入点 (选中时)'],
        ['Shift + click 顶点', '删点 (选中时)']
      ]},
      { t: '吸管 (I 工具) 模式切换', items: [
        ['1', '吸 terrain'], ['2', '吸 level'], ['3', '吸 autonomy'],
        ['4', '吸 colorKey'], ['5', '吸 height']
      ]},
      { t: '热图 (V 工具下)', items: [
        ['1', '人口'], ['2', '税'], ['3', '族群'], ['4', '信仰'], ['5', '自治'],
        ['6 / 0', '关'],
        ['(pick / brush 工具下 1-5 由其拦)', '']
      ]},
      { t: 'raster 画笔 (U / Y)', items: [
        ['drag 画', '画'],
        ['D', '画模式'], ['F', '桶模式'], ['X', '擦模式'],
        ['[ / ]', '改尺寸']
      ]},
      { t: 'UI overlay', items: [
        ['Ctrl+K / ⌘+K', '命令搜'],
        ['Ctrl+F / ⌘+F', '搜省·跳'],
        ['Ctrl+C', '复字段·选省'], ['Ctrl+V', '粘字段·至选省'],
        ['F1-F4', '跳视角'], ['Shift+F1-F4', '设视角'], ['Alt+F1-F4', '清'],
        ['Alt+1-9', '切朝代槽'],
        ['M', '合并选省'], ['Shift+M', '预览合并·M 提交·Esc 撤'],
        ['Ctrl+Shift+G', 'polygon 校验·一键修复'],
        ['Ctrl+Shift+H', '选省 → 子级 N 分 (路→府→县)'],
        ['?', '此 cheatsheet'],
        ['N', '重算邻 (检邻)']
      ]},
      { t: '视觉 toggle (Ctrl+Alt 避浏览器冲)', items: [
        ['Ctrl+Alt+B', '边界·单墨线 ↔ 双金线 (再加 Shift 切风格)'],
        ['Ctrl+Alt+L', '智能标签 (分级 + 避让)'],
        ['Ctrl+Alt+C', '气候 view'],
        ['Ctrl+Alt+S', '季节切·春→夏→秋→冬'],
        ['Ctrl+Alt+U', '文化层·族→信→关'],
        ['Ctrl+Alt+F', 'fog 预览·选省作 POV'],
        ['Ctrl+Alt+I', 'impassable 圈定 (省内不通)'],
        ['Ctrl+Alt+Z', 'zoom-blend HUD'],
        ['Ctrl+Alt+P', '★ 玩家显·锁卷轴 + click 弹省'],
      ]}
    ];

    return '<div style="display:flex; align-items:baseline; justify-content:space-between; margin-bottom:var(--sp-4); padding-bottom:var(--sp-3); border-bottom:1px solid var(--bd-1);">' +
      '<div style="font-size:var(--fs-xl); color:var(--gold-1); font-weight:var(--fw-sb); letter-spacing:0.06em;">熱鍵總覽</div>' +
      '<div style="color:var(--paper-3); font-size:var(--fs-xs); font-family:var(--font-mono);">Esc 关 · 任处点关</div>' +
      '</div>' +
      '<div style="display:grid; grid-template-columns:1fr 1fr; gap:var(--sp-5) var(--sp-6);">' +
      sections.map(function(s){
        return '<div>' +
          '<div style="color:var(--gold-2); font-size:var(--fs-md); margin-bottom:var(--sp-2); font-weight:var(--fw-m); letter-spacing:0.06em;">' + s.t + '</div>' +
          s.items.map(function(it){
            return '<div style="display:grid; grid-template-columns:130px 1fr; gap:var(--sp-2); padding:3px 0; align-items:baseline;">' +
              '<kbd>' + escHtml(it[0]) + '</kbd>' +
              '<span style="color:var(--paper-1); font-size:var(--fs-sm);">' + escHtml(it[1]) + '</span>' +
            '</div>';
          }).join('') +
        '</div>';
      }).join('') +
      '</div>' +
      '<div style="text-align:right; margin-top:var(--sp-4);">' +
        '<button class="me-btn me-cheat-close">关 (Esc)</button>' +
      '</div>';
  }

  function showCheat(){
    createCheatsheet();
    cheatEl.style.display = 'block';
    cheatVisible = true;
  }
  function hideCheat(){
    if (cheatEl) cheatEl.style.display = 'none';
    cheatVisible = false;
  }

  // ════════════════════════════════════════════════════════════════
  // ③ toast
  // ════════════════════════════════════════════════════════════════

  var toastEl = null;
  function ensureToastContainer(){
    if (toastEl) return toastEl;
    toastEl = document.createElement('div');
    toastEl.id = 'me-toast-zone';
    toastEl.style.cssText = 'position:fixed; right:var(--sp-4); bottom:var(--sp-4); z-index:2000; display:flex; flex-direction:column; gap:var(--sp-2); pointer-events:none; max-width:380px;';
    document.body.appendChild(toastEl);
    return toastEl;
  }

  function toast(msg, type, duration){
    type = type || 'info';
    duration = duration || 2800;
    ensureToastContainer();
    var color = type === 'error' ? 'var(--vmln-1)' :
                type === 'success' ? 'var(--jade-1)' :
                type === 'warn' ? 'var(--gold-2)' :
                'var(--cyan-1)';
    var t = document.createElement('div');
    t.style.cssText = 'pointer-events:auto; padding:var(--sp-3) var(--sp-4); background:linear-gradient(180deg, var(--ink-3), var(--ink-2)); border:1px solid var(--bd-1); border-left:3px solid ' + color + '; border-radius:var(--rd-3); color:var(--paper-1); font-size:var(--fs-sm); box-shadow:var(--sh-2); transform:translateX(100%) ; opacity:0; transition:transform var(--t-spring), opacity var(--t-default);';
    t.textContent = msg;
    toastEl.appendChild(t);
    requestAnimationFrame(function(){
      t.style.transform = 'translateX(0)';
      t.style.opacity = '1';
    });
    setTimeout(function(){
      t.style.transform = 'translateX(100%)';
      t.style.opacity = '0';
      setTimeout(function(){ t.remove(); }, 280);
    }, duration);
  }

  // ════════════════════════════════════════════════════════════════
  // ④ 全局 hotkey 路由
  // ════════════════════════════════════════════════════════════════

  document.addEventListener('keydown', function(e){
    // 在 input / textarea 内·只让 Cmd+K 生效
    var inField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT');
    var isPaletteInput = paletteInput && e.target === paletteInput;

    // Cmd+K / Ctrl+K·command palette
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k'){
      e.preventDefault();
      if (paletteVisible) hidePalette();
      else showPalette();
      return;
    }
    // ? · cheatsheet
    if (!inField && e.key === '?' && !cheatVisible){
      e.preventDefault();
      showCheat();
      return;
    }
    // Esc · 关任一 overlay
    if (e.key === 'Escape'){
      if (paletteVisible){ hidePalette(); return; }
      if (cheatVisible){ hideCheat(); return; }
    }
  });

  // ════════════════════════════════════════════════════════════════
  // ⑤ helpers
  // ════════════════════════════════════════════════════════════════

  function escHtml(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ════════════════════════════════════════════════════════════════
  // expose
  // ════════════════════════════════════════════════════════════════

  global.meToast = toast;
  // meAlert·alert() 替代·短 → toast·长 (含 \n) → native alert
  // 默 type='error'·call meAlert(msg, 'warn') / 'success' / 'info' 升级
  global.meAlert = function(msg, type){
    var s = String(msg == null ? '' : msg);
    if (s.indexOf('\n') >= 0 || s.length > 140){
      return alert(s);
    }
    if (typeof toast === 'function') toast(s, type || 'error', 3500);
    else alert(s);
  };
  global.meShowPalette = showPalette;
  global.meShowCheat = showCheat;
  global.meHidePalette = hidePalette;
  global.meHideCheat = hideCheat;

})(typeof window !== 'undefined' ? window : this);
