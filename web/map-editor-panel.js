// map-editor-panel.js
// right panel·full ~50 字段·6 tab
// phase 2·全字段表单·nested objects·batch edit
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[panel] core not loaded'); return; }

  // ─── option lists ──────────────────────────────────────────

  var TERRAIN_OPTS = ['平原','丘陵','山地','水乡','沿海','沙漠','草原','高原','戈壁','森林'];
  var TAX_OPTS = ['轻','中','重'];
  var REGION_OPTS = ['normal','jimi','tusi','fanbang','imperial_clan'];
  var TREATS_AS_OPTS = ['实控','羁縻','朝贡','虚封','名义'];
  var CARRY_REGIME_OPTS = ['underloaded','balanced','stressed','overloaded','collapsing'];
  var AUTONOMY_OPTS = [
    { v: 'zhixia',   l: '直辖' },
    { v: 'fanguo',   l: '藩国' },
    { v: 'fanzhen',  l: '藩镇' },
    { v: 'jimi',     l: '羁縻' },
    { v: 'chaogong', l: '朝贡' }
  ];
  var AUTONOMY_SUBTYPE_OPTS = [
    { v: '',         l: '(无)' },
    { v: 'real',     l: '实封' },
    { v: 'nominal',  l: '虚封' }
  ];
  var PERMISSION_ACTIONS = ['appoint','tax','edict','reform'];
  var PERMISSION_LABELS = { appoint:'任免', tax:'征税', edict:'诏令', reform:'改制' };

  var ETHNICITY_PRESETS = ['汉','满','蒙','回','藏','苗','壮','彝','维','朝','傣','契丹','女真','党项','突厥','吐蕃','回鹘','奚','匈奴','羌','越','华夏','色目','蛮','夷','戎','狄','诸蕃','其他'];
  var FAITH_PRESETS = ['儒','佛','道','巫','祖','萨满','伊','基','祆','摩尼','也里可温','犹','拜火','民间'];

  var _container = null;
  var _activeTab = 'basic';

  // ─── init ──────────────────────────────────────────────────

  function init(containerId){
    _container = document.getElementById(containerId);
    if (!_container){ console.error('[panel] container not found:', containerId); return false; }
    render();
    ME.on('selection-change', render);
    ME.on('mutation', render);
    ME.on('map-loaded', render);
    return true;
  }

  function render(){
    if (!_container) return;
    var sel = ME.getSelected();
    if (sel.length === 0){
      _container.innerHTML = renderEmpty();
      return;
    }
    if (sel.length > 1){
      _container.innerHTML = renderMulti(sel);
      bindMulti(sel);
      return;
    }
    _container.innerHTML = renderSingle(sel[0]);
    bindSingle(sel[0]);
  }

  // ─── empty / multi ────────────────────────────────────────

  function renderEmpty(){
    var nDivs = ME.EDITOR.map.divisions.length;
    var dynasty = TM.MapEditor.dynasty.get(ME.EDITOR.map.dynasty);
    return '\
      <div class="me-panel-empty">\
        <div class="me-empty-title">未选省</div>\
        <div class="me-empty-meta">总省 <b>' + nDivs + '</b> · 朝代 <b>' + dynasty.label + '</b></div>\
        <div class="me-empty-tip">用 <kbd>V</kbd> 选省·<kbd>P</kbd> 画省·<kbd>E</kbd> 编顶点·<kbd>H</kbd>/空格 拖图·<kbd>Z</kbd>/滚轮 缩放</div>\
        <div class="me-empty-hint">闭合 polygon·点首点 (距离 ≤ 12px)</div>\
        <div class="me-empty-hint">Ctrl+Z undo · Ctrl+Y redo · Del 删省 · 0 居中</div>\
        <div class="me-empty-hint">Shift+click·多选·Alt+click 边·加点·Shift+click 顶点·删点</div>\
      </div>\
    ';
  }

  function renderMulti(sel){
    var ids = sel.map(function(d){ return esc(d.name) + ' (' + d.id.slice(-4) + ')'; });

    // phase 16.2·level 选项·按当前 dynasty
    var dyn = TM.MapEditor.dynasty.get(ME.EDITOR.map.dynasty);
    var lvlOpts = '<option value="">(不改)</option>' + (dyn.levels || []).map(function(L){
      return '<option value="' + L.key + '">' + esc(L.label) + '</option>';
    }).join('');

    var batchHtml = '\
      <div class="me-batch-section">\
        <div class="me-divider">批量编辑·改公字段·apply 到全部 ' + sel.length + ' 选省</div>\
        ' + field('层级→', '<select data-batch="level">' + lvlOpts + '</select>') + '\
        ' + field('地形→', '<select data-batch="terrain"><option value="">(不改)</option>' + TERRAIN_OPTS.map(function(o){ return '<option value="' + o + '">' + o + '</option>'; }).join('') + '</select>') + '\
        ' + field('税档→', '<select data-batch="taxLevel"><option value="">(不改)</option>' + TAX_OPTS.map(function(o){ return '<option value="' + o + '">' + o + '</option>'; }).join('') + '</select>') + '\
        ' + field('区类→', '<select data-batch="regionType"><option value="">(不改)</option>' + REGION_OPTS.map(function(o){ return '<option value="' + o + '">' + o + '</option>'; }).join('') + '</select>') + '\
        ' + field('自治·类→', '<select data-batch="autonomy.type"><option value="">(不改)</option>' + AUTONOMY_OPTS.map(function(o){ return '<option value="' + o.v + '">' + o.l + '</option>'; }).join('') + '</select>') + '\
        ' + field('自治·受封者→', '<input type="text" data-batch="autonomy.holder" placeholder="(留空 不改)" />') + '\
        ' + field('自治·宗主→', '<input type="text" data-batch="autonomy.suzerain" placeholder="(留空 不改)" />') + '\
        ' + field('法理主→', '<input type="text" data-batch="dejureOwner" placeholder="(留空 不改)" />') + '\
        ' + field('当任·主官→', '<input type="text" data-batch="governor" placeholder="(留空 不改)" />') + '\
        ' + field('官职→', '<input type="text" data-batch="officialPosition" placeholder="(留空 不改)" />') + '\
        ' + field('繁荣 0-100→', '<input type="number" data-batch="prosperity" min="0" max="100" placeholder="(空 不改)" />') + '\
        ' + field('民心→', '<input type="number" data-batch="minxinLocal" min="0" max="100" placeholder="(空 不改)" />') + '\
        <div class="me-divider" style="margin-top:8px;">改名 (字串改造)</div>\
        ' + field('前缀加→', '<input type="text" data-batch-name="prefix" placeholder="(空)" />') + '\
        ' + field('后缀加→', '<input type="text" data-batch-name="suffix" placeholder="(空·如 ·北)" />') + '\
        <div class="me-divider" style="margin-top:8px;">flags (覆盖)</div>\
        <div style="display:grid; grid-template-columns:repeat(2,1fr); gap:4px; padding:0 4px;">\
          <label class="me-flag"><input type="checkbox" data-batch-flag="isCapital" /> isCapital</label>\
          <label class="me-flag"><input type="checkbox" data-batch-flag="isFrontier" /> isFrontier</label>\
          <label class="me-flag"><input type="checkbox" data-batch-flag="isJunDi" /> isJunDi</label>\
          <label class="me-flag"><input type="checkbox" data-batch-flag="isTunTian" /> isTunTian</label>\
          <label class="me-flag"><input type="checkbox" data-batch-flag="isTradePort" /> isTradePort</label>\
          <label class="me-flag"><input type="checkbox" data-batch-flag="isHistoric" /> isHistoric</label>\
        </div>\
        <div style="font-size:var(--fs-xxs); color:var(--paper-3); margin:4px 0;">勾上 = 设 true·未勾 = 不动·若先全勾再 alt+click = 设 false (保留语义可后扩)</div>\
        <div class="me-actions" style="margin-top:10px;">\
          <button class="me-btn me-btn-warn" data-act="apply-batch">应用到选省</button>\
        </div>\
      </div>\
    ';

    var selectionActions = '\
      <div class="me-divider" style="margin-top:8px;">选区拓展</div>\
      <div class="me-actions">\
        <button class="me-btn" data-act="sel-all">全选</button>\
        <button class="me-btn" data-act="sel-invert">反选</button>\
        <button class="me-btn" data-act="sel-same-level" title="选与当前 anchor 同 level 的全部">同层级</button>\
        <button class="me-btn" data-act="sel-same-terrain" title="选与当前 anchor 同 terrain">同地形</button>\
        <button class="me-btn" data-act="sel-same-regionType">同 regionType</button>\
        <button class="me-btn" data-act="sel-same-autonomy">同自治</button>\
      </div>\
    ';

    return '\
      <div class="me-panel-multi">\
        <div class="me-multi-title">已选 <b>' + sel.length + '</b> 省</div>\
        <ul class="me-multi-list">' + ids.map(function(i){ return '<li>' + i + '</li>'; }).join('') + '</ul>\
        <div class="me-actions">\
          <button class="me-btn" data-act="clear">清空选</button>\
          <button class="me-btn me-btn-danger" data-act="delete">删除全部</button>\
        </div>\
        ' + selectionActions + '\
        ' + batchHtml + '\
      </div>\
    ';
  }

  function bindMulti(sel){
    _container.querySelector('[data-act="clear"]').addEventListener('click', function(){
      ME.selectClear();
    });
    _container.querySelector('[data-act="delete"]').addEventListener('click', function(){
      var s = ME.getSelected();
      if (s.length === 0) return;
      if (!confirm('删除 ' + s.length + ' 个省? undo 可救')) return;
      s.forEach(function(d){ ME.removeDivision(d.id); });
    });
    _container.querySelector('[data-act="apply-batch"]').addEventListener('click', function(){
      applyBatch();
    });
    // phase 16.2·选区拓展
    var Mq = TM.MapEditor.marquee;
    function bindSel(act, fn){
      var btn = _container.querySelector('[data-act="' + act + '"]');
      if (btn) btn.addEventListener('click', fn);
    }
    bindSel('sel-all', function(){
      if (!Mq) return;
      var n = Mq.selectAll();
      if (global.meToast) meToast('全选·' + n + ' 省', 'info', 1200);
    });
    bindSel('sel-invert', function(){
      if (!Mq) return;
      var n = Mq.invertSelection();
      if (global.meToast) meToast('反选·' + n + ' 省', 'info', 1200);
    });
    bindSel('sel-same-level', function(){
      if (Mq){ var n = Mq.selectSameAttr('level'); if (global.meToast) meToast('同层级·' + n, 'info', 1200); }
    });
    bindSel('sel-same-terrain', function(){
      if (Mq){ var n = Mq.selectSameAttr('terrain'); if (global.meToast) meToast('同地形·' + n, 'info', 1200); }
    });
    bindSel('sel-same-regionType', function(){
      if (Mq){ var n = Mq.selectSameAttr('regionType'); if (global.meToast) meToast('同 regionType·' + n, 'info', 1200); }
    });
    bindSel('sel-same-autonomy', function(){
      if (Mq){ var n = Mq.selectSameAttr('autonomy.type'); if (global.meToast) meToast('同自治·' + n, 'info', 1200); }
    });
  }

  function applyBatch(){
    var inputs = _container.querySelectorAll('[data-batch]');
    var patches = {};
    var hasAny = false;
    inputs.forEach(function(input){
      var key = input.getAttribute('data-batch');
      var v = input.value;
      if (v === '' || v == null) return;
      if (input.type === 'number') v = Number(v);
      patches[key] = v;
      hasAny = true;
    });
    // phase 16.2·name 前缀/后缀
    var nameInputs = _container.querySelectorAll('[data-batch-name]');
    var prefix = '', suffix = '';
    nameInputs.forEach(function(input){
      var which = input.getAttribute('data-batch-name');
      if (which === 'prefix') prefix = input.value;
      else if (which === 'suffix') suffix = input.value;
    });
    if (prefix || suffix) hasAny = true;

    // phase 16.2·flag 复选 (只设 true·不勾不动)
    var flagInputs = _container.querySelectorAll('[data-batch-flag]');
    var flags = {};
    flagInputs.forEach(function(input){
      if (input.checked){
        flags[input.getAttribute('data-batch-flag')] = true;
        hasAny = true;
      }
    });

    if (!hasAny){ meAlert('未填字段·无可应用'); return; }
    var sel = ME.getSelected();
    if (sel.length === 0) return;

    var keys = Object.keys(patches);
    var fkeys = Object.keys(flags);
    var nameOps = (prefix || suffix) ? 1 : 0;
    var totalCols = keys.length + fkeys.length + nameOps;
    var n = sel.length;
    if (!confirm('批量改 ' + totalCols + ' 字段 → ' + n + ' 省·确认?')) return;

    ME.commitMutation('batch edit ' + n + ' x ' + totalCols, function(){
      sel.forEach(function(d){
        keys.forEach(function(k){
          applyDeepPath(d, k, patches[k]);
        });
        fkeys.forEach(function(fk){
          d[fk] = true;
        });
        if (prefix || suffix){
          d.name = (prefix || '') + (d.name || '') + (suffix || '');
        }
      });
    });
    if (global.meToast){
      meToast('批量·已改 ' + n + ' 省·' + totalCols + ' 字段', 'success');
    } else if (document.getElementById('status-tip')) {
      document.getElementById('status-tip').textContent = '批量·已改 ' + n + ' 省 ' + totalCols + ' 字段';
    }
  }

  // ─── single·6 tab ─────────────────────────────────────────

  function renderSingle(d){
    var dynastyId = ME.EDITOR.map.dynasty;
    var dyn = TM.MapEditor.dynasty.get(dynastyId);
    var lvlOpts = dyn.levels.map(function(L){
      return '<option value="' + L.key + '"' + (L.key === d.level ? ' selected' : '') + '>' + esc(L.label) + '</option>';
    }).join('');

    var tabs = ['basic', 'pop', 'econ', 'gov', 'history', 'flags'];
    var tabLabels = { basic:'基本', pop:'人口', econ:'经济', gov:'治理', history:'史', flags:'标' };

    var nExtra = (d.extraPolygons || []).length;
    var nHoles = (d.holes || []).length;
    var extraVerts = (d.extraPolygons || []).reduce(function(s, p){ return s + p.length; }, 0);
    var holeVerts = (d.holes || []).reduce(function(s, p){ return s + p.length; }, 0);
    var totalVerts = d.polygon.length + extraVerts + holeVerts;

    var exclaveHtml = nExtra === 0 ? '' : '\
      <div class="me-exclave-list">\
        <div class="me-exclave-hdr">飞地 ' + nExtra + ' 块</div>\
        ' + (d.extraPolygons || []).map(function(p, i){
          return '<div class="me-exclave-row" data-exclave-idx="' + i + '">\
            <span class="me-exclave-label">飞地 #' + (i + 1) + ' · ' + p.length + ' 顶</span>\
            <button class="me-exclave-del" data-exclave-del="' + i + '" title="删此飞地">×</button>\
          </div>';
        }).join('') + '\
      </div>';

    var holeHtml = nHoles === 0 ? '' : '\
      <div class="me-hole-list">\
        <div class="me-hole-hdr">圈 ' + nHoles + ' 块·非领土</div>\
        ' + (d.holes || []).map(function(p, i){
          return '<div class="me-hole-row" data-hole-idx="' + i + '">\
            <span class="me-hole-label">圈 #' + (i + 1) + ' · ' + p.length + ' 顶</span>\
            <button class="me-hole-del" data-hole-del="' + i + '" title="删此圈">×</button>\
          </div>';
        }).join('') + '\
      </div>';

    var hdr = '\
      <div class="me-panel-hdr">\
        <input class="me-hdr-name" data-f="name" value="' + esc(d.name) + '" placeholder="省名" />\
        <div class="me-hdr-meta">id <code>' + d.id.slice(-8) + '</code> · 顶 <b>' + totalVerts + '</b> (主 ' + d.polygon.length + (nExtra > 0 ? ' + ' + nExtra + ' 飞 ' + extraVerts : '') + (nHoles > 0 ? ' + ' + nHoles + ' 圈 ' + holeVerts : '') + ') · 面 <b>' + Math.round(d.area) + '</b> · 邻 <b>' + (d.neighbors||[]).length + '</b></div>\
        ' + exclaveHtml + '\
        ' + holeHtml + '\
        <div class="me-actions">\
          <button class="me-btn" data-act="dup">复制</button>\
          <button class="me-btn" data-act="add-exclave">+ 飞地</button>\
          <button class="me-btn" data-act="add-hole">+ 圈</button>\
          <button class="me-btn" data-act="recompute">重算几何</button>\
          <button class="me-btn me-btn-danger" data-act="del">删省</button>\
        </div>\
      </div>\
    ';

    var tabBar = '<div class="me-tabs">' + tabs.map(function(t){
      return '<button class="me-tab' + (_activeTab === t ? ' active' : '') + '" data-tab="' + t + '">' + tabLabels[t] + '</button>';
    }).join('') + '</div>';

    return hdr + tabBar + '<div class="me-tab-body">' + renderTab(_activeTab, d, dyn, lvlOpts) + '</div>';
  }

  function renderTab(tab, d, dyn, lvlOpts){
    if (tab === 'basic') return renderBasic(d, dyn, lvlOpts);
    if (tab === 'pop')   return renderPop(d);
    if (tab === 'econ')  return renderEcon(d);
    if (tab === 'gov')   return renderGov(d);
    if (tab === 'history') return renderHistory(d);
    if (tab === 'flags') return renderFlags(d);
    return '';
  }

  // ── basic tab (~10 fields) ────────────────────────────────
  function renderBasic(d, dyn, lvlOpts){
    var regionOpts = REGION_OPTS.map(function(o){
      return '<option value="' + o + '"' + (o === d.regionType ? ' selected' : '') + '>' + o + '</option>';
    }).join('');
    var treatsOpts = TREATS_AS_OPTS.map(function(o){
      return '<option value="' + o + '"' + (o === d.treats_as ? ' selected' : '') + '>' + o + '</option>';
    }).join('');
    return '\
      ' + field('级别', '<select data-f="level">' + lvlOpts + '</select>') + '\
      ' + field('描述', '<textarea data-f="description" rows="2" placeholder="此省备注·(可选)">' + esc(d.description) + '</textarea>') + '\
      ' + field('官职', '<input type="text" data-f="officialPosition" value="' + esc(d.officialPosition) + '" placeholder="郡守 / 县令 ..." />') + '\
      ' + field('当任·主官', '<input type="text" data-f="governor" value="' + esc(d.governor) + '" placeholder="人物名" />') + '\
      ' + field('法理主', '<input type="text" data-f="dejureOwner" value="' + esc(d.dejureOwner) + '" placeholder="法定派系" />') + '\
      ' + field('区类', '<select data-f="regionType">' + regionOpts + '</select>') + '\
      ' + field('边界类', '<select data-f="treats_as">' + treatsOpts + '</select>') + '\
      ' + field('条约年', '<input type="number" data-f="treaty_year" value="' + (d.treaty_year || '') + '" placeholder="(可选)" />') + '\
      ' + field('覆盖序', '<input type="number" data-f="z_order" value="' + d.z_order + '" />') + '\
      ' + field('治所·子区 id', '<input type="text" data-f="capitalChildId" value="' + esc(d.capitalChildId) + '" placeholder="子区 id·继承 governor/tax" />') + '\
      ' + renderCrossDynastyField(d) + '\
    ';
  }

  function renderCrossDynastyField(d){
    var cid = d.crossDynastyId || '';
    var hasLink = !!cid;
    return '\
      <div class="me-field">\
        <label class="me-label">crossDynastyId·跨朝代地点</label>\
        <div class="me-ctrl" style="display:grid; grid-template-columns:1fr auto; gap:4px;">\
          <input type="text" data-f="crossDynastyId" value="' + esc(cid) + '" placeholder="(空) 此省独立·或链同地异朝" style="font-family:Menlo,monospace; font-size:10px;" />\
          <button class="me-btn me-btn-warn" data-act="cross-view" title="跨朝代查看 / 链接">' + (hasLink ? '查看' : '链接') + '</button>\
        </div>\
      </div>\
    ';
  }

  // ── pop tab (~12 fields) ──────────────────────────────────
  function renderPop(d){
    var pd = d.populationDetail || {};
    var byEth = d.byEthnicity || {};
    var byFth = d.byFaith || {};
    return '\
      <div class="me-divider">populationDetail·总人口</div>\
      ' + field('户数', '<input type="number" data-f="populationDetail.households" value="' + (pd.households || 0) + '" min="0" />') + '\
      ' + field('口数', '<input type="number" data-f="populationDetail.mouths" value="' + (pd.mouths || 0) + '" min="0" />') + '\
      ' + field('丁数', '<input type="number" data-f="populationDetail.ding" value="' + (pd.ding || 0) + '" min="0" />') + '\
      ' + field('逃户', '<input type="number" data-f="populationDetail.fugitives" value="' + (pd.fugitives || 0) + '" min="0" />') + '\
      ' + field('隐户', '<input type="number" data-f="populationDetail.hiddenCount" value="' + (pd.hiddenCount || 0) + '" min="0" />') + '\
      \
      <div class="me-divider">byEthnicity·族群占比 (sum 应 = 1)</div>\
      ' + renderRatioMap('byEthnicity', byEth, ETHNICITY_PRESETS) + '\
      \
      <div class="me-divider">byFaith·信仰占比 (sum 应 = 1)</div>\
      ' + renderRatioMap('byFaith', byFth, FAITH_PRESETS) + '\
      \
      <div class="me-divider">baojia·保甲 (阶段 3 详填)</div>\
      <div class="me-tip">' + (d.baojia ? ('保 ' + (d.baojia.baoCount||0) + ' / 甲 ' + (d.baojia.jiaCount||0) + ' / 牌 ' + (d.baojia.paiCount||0)) : '(无 baojia 数据)') + '</div>\
    ';
  }

  // ── econ tab (~16 fields) ─────────────────────────────────
  function renderEcon(d){
    var taxOpts = TAX_OPTS.map(function(o){
      return '<option value="' + o + '"' + (o === d.taxLevel ? ' selected' : '') + '>' + o + '</option>';
    }).join('');
    var cc = d.carryingCapacity || {};
    var fd = d.fiscalDetail || {};
    var pt = d.publicTreasuryInit || {};
    var tg = d.tags || {};
    var eb = d.economyBase || {};
    var ia = eb.imperialAssets || {};
    var regimeOpts = CARRY_REGIME_OPTS.map(function(o){
      return '<option value="' + o + '"' + (o === cc.carryingRegime ? ' selected' : '') + '>' + o + '</option>';
    }).join('');
    return '\
      ' + field('繁荣', '<input type="range" data-f="prosperity" min="0" max="100" step="1" value="' + d.prosperity + '" /><span class="me-rng">' + d.prosperity + '</span>') + '\
      ' + field('税档', '<select data-f="taxLevel">' + taxOpts + '</select>') + '\
      ' + field('地形', renderTerrain(d.terrain)) + '\
      ' + field('特产', '<input type="text" data-f="specialResources" value="' + esc(d.specialResources) + '" placeholder="盐 / 铁 / 丝 / 茶 / 瓷 / 木 ..." />') + '\
      \
      <div class="me-divider">tags·区域属性 (gate economyBase)</div>\
      ' + field('沿海港', '<input type="checkbox" data-f="tags.hasPort"' + (tg.hasPort ? ' checked' : '') + ' /> <span class="me-fld-hint">海贸 / 市舶税</span>') + '\
      ' + field('产盐区', '<input type="checkbox" data-f="tags.saltRegion"' + (tg.saltRegion ? ' checked' : '') + ' /> <span class="me-fld-hint">盐课</span>') + '\
      ' + field('产矿区', '<input type="checkbox" data-f="tags.mineralRegion"' + (tg.mineralRegion ? ' checked' : '') + ' /> <span class="me-fld-hint">矿税</span>') + '\
      ' + field('草场马政', '<input type="checkbox" data-f="tags.horseRegion"' + (tg.horseRegion ? ' checked' : '') + ' /> <span class="me-fld-hint">马征折银</span>') + '\
      ' + field('渔区', '<input type="checkbox" data-f="tags.fishingRegion"' + (tg.fishingRegion ? ' checked' : '') + ' /> <span class="me-fld-hint">渔课</span>') + '\
      ' + field('皇室直辖', '<input type="checkbox" data-f="tags.imperialDomain"' + (tg.imperialDomain ? ' checked' : '') + ' /> <span class="me-fld-hint">皇庄/织造/矿场/御窑</span>') + '\
      \
      <div class="me-divider">economyBase·经济基础·田商</div>\
      ' + field('在编田亩', '<input type="number" data-f="economyBase.farmland" value="' + (eb.farmland || 0) + '" min="0" />') + '\
      ' + field('商业体量', '<input type="number" data-f="economyBase.commerceVolume" value="' + (eb.commerceVolume || 0) + '" min="0" />') + '\
      ' + field('商业系数', '<input type="number" data-f="economyBase.commerceCoefficient" value="' + (eb.commerceCoefficient != null ? eb.commerceCoefficient : 1.0) + '" step="0.1" min="0.2" max="6" />') + '\
      \
      <div class="me-divider">economyBase·资源产能 (按 tag 计入)</div>\
      ' + field('海贸量', '<input type="number" data-f="economyBase.maritimeTradeVolume" value="' + (eb.maritimeTradeVolume || 0) + '" min="0" />') + '\
      ' + field('盐产 (斤/年)', '<input type="number" data-f="economyBase.saltProduction" value="' + (eb.saltProduction || 0) + '" min="0" />') + '\
      ' + field('矿产 (两/年)', '<input type="number" data-f="economyBase.mineralProduction" value="' + (eb.mineralProduction || 0) + '" min="0" />') + '\
      ' + field('马匹 (匹/年)', '<input type="number" data-f="economyBase.horseProduction" value="' + (eb.horseProduction || 0) + '" min="0" />') + '\
      ' + field('渔产 (两/年)', '<input type="number" data-f="economyBase.fishingProduction" value="' + (eb.fishingProduction || 0) + '" min="0" />') + '\
      \
      <div class="me-divider">economyBase·皇室直辖资产</div>\
      ' + field('皇庄亩数', '<input type="number" data-f="economyBase.imperialFarmland" value="' + (eb.imperialFarmland || 0) + '" min="0" />') + '\
      ' + field('织造局数', '<input type="number" data-f="economyBase.imperialAssets.zhizao" value="' + (ia.zhizao || 0) + '" min="0" />') + '\
      ' + field('矿场数', '<input type="number" data-f="economyBase.imperialAssets.kuangchang" value="' + (ia.kuangchang || 0) + '" min="0" />') + '\
      ' + field('御窑数', '<input type="number" data-f="economyBase.imperialAssets.yuyao" value="' + (ia.yuyao || 0) + '" min="0" />') + '\
      \
      <div class="me-divider">economyBase·基建</div>\
      ' + field('驿站数', '<input type="number" data-f="economyBase.postRelays" value="' + (eb.postRelays || 0) + '" min="0" />') + '\
      ' + field('科举解额', '<input type="number" data-f="economyBase.kejuQuota" value="' + (eb.kejuQuota || 0) + '" min="0" />') + '\
      ' + field('道路质量', '<input type="number" data-f="economyBase.roadQuality" value="' + (eb.roadQuality != null ? eb.roadQuality : 50) + '" min="0" max="100" />') + '\
      \
      <div class="me-divider">economyBase·田亩流转 (兼并·开垦·清丈)</div>\
      ' + field('兼并田', '<input type="number" data-f="economyBase.landsAnnexed" value="' + (eb.landsAnnexed || 0) + '" min="0" />') + '\
      ' + field('开垦田', '<input type="number" data-f="economyBase.landsReclaimed" value="' + (eb.landsReclaimed || 0) + '" min="0" />') + '\
      ' + field('清丈田', '<input type="number" data-f="economyBase.landsSurveyed" value="' + (eb.landsSurveyed || 0) + '" min="0" />') + '\
      \
      <div class="me-divider"><span>economyBase·在灾实录</span><button class="me-dis-add" data-act="add-disaster" type="button">+ 添灾</button></div>\
      <div class="me-dis-rows">' + renderDisasterRows(eb.disasterRecord || []) + '</div>\
      \
      <div class="me-divider">carryingCapacity·承载力</div>\
      ' + field('耕地承载', '<input type="number" data-f="carryingCapacity.arable" value="' + (cc.arable || 0) + '" min="0" />') + '\
      ' + field('水源上限', '<input type="number" data-f="carryingCapacity.water" value="' + (cc.water || 0) + '" min="0" />') + '\
      ' + field('气候系数', '<input type="number" data-f="carryingCapacity.climate" value="' + (cc.climate || 1) + '" step="0.01" min="0" max="2" />') + '\
      ' + field('历史承载', '<input type="number" data-f="carryingCapacity.historicalCap" value="' + (cc.historicalCap || 0) + '" />') + '\
      ' + field('当前负载', '<input type="number" data-f="carryingCapacity.currentLoad" value="' + (cc.currentLoad || 0) + '" step="0.01" />') + '\
      ' + field('态·承载状态', '<select data-f="carryingCapacity.carryingRegime"><option value="">(无)</option>' + regimeOpts + '</select>') + '\
      \
      <div class="me-divider">fiscalDetail·财政</div>\
      ' + field('名义赋税', '<input type="number" data-f="fiscalDetail.claimedRevenue" value="' + (fd.claimedRevenue || 0) + '" />') + '\
      ' + field('实征收', '<input type="number" data-f="fiscalDetail.actualRevenue" value="' + (fd.actualRevenue || 0) + '" />') + '\
      ' + field('起运中央', '<input type="number" data-f="fiscalDetail.remittedToCenter" value="' + (fd.remittedToCenter || 0) + '" />') + '\
      ' + field('留存本级', '<input type="number" data-f="fiscalDetail.retainedBudget" value="' + (fd.retainedBudget || 0) + '" />') + '\
      ' + field('合规率', '<input type="number" data-f="fiscalDetail.compliance" value="' + (fd.compliance || 0) + '" step="0.01" min="0" max="1" />') + '\
      ' + field('贪污率', '<input type="number" data-f="fiscalDetail.skimmingRate" value="' + (fd.skimmingRate || 0) + '" step="0.01" min="0" max="1" />') + '\
      ' + field('财政自治度', '<input type="number" data-f="fiscalDetail.autonomyLevel" value="' + (fd.autonomyLevel || 0) + '" step="0.01" min="0" max="1" />') + '\
      \
      <div class="me-divider">publicTreasuryInit·初始库存</div>\
      ' + field('库银', '<input type="number" data-f="publicTreasuryInit.money" value="' + (pt.money || 0) + '" />') + '\
      ' + field('库粮', '<input type="number" data-f="publicTreasuryInit.grain" value="' + (pt.grain || 0) + '" />') + '\
      ' + field('库布', '<input type="number" data-f="publicTreasuryInit.cloth" value="' + (pt.cloth || 0) + '" />') + '\
    ';
  }

  // ── gov tab (~20 fields) ──────────────────────────────────
  function renderGov(d){
    var perms = d.permissions || {};
    var permRows = PERMISSION_ACTIONS.map(function(act){
      var p = perms[act] || { allow: true, mode: 'direct', cost: '' };
      return '\
        <div class="me-perm-row">\
          <div class="me-perm-label">' + PERMISSION_LABELS[act] + ' (' + act + ')</div>\
          <label class="me-perm-allow"><input type="checkbox" data-f="permissions.' + act + '.allow"' + (p.allow ? ' checked' : '') + ' /> 允许</label>\
          <input type="text" data-f="permissions.' + act + '.mode" value="' + esc(p.mode || '') + '" placeholder="mode·direct/indirect/restricted/ritual" />\
          <input type="text" data-f="permissions.' + act + '.cost" value="' + esc(p.cost || '') + '" placeholder="cost·消耗 (free/medium/high...)" />\
        </div>\
      ';
    }).join('');

    return '\
      ' + field('地方民心', '<input type="range" data-f="minxinLocal" min="0" max="100" step="1" value="' + d.minxinLocal + '" /><span class="me-rng">' + d.minxinLocal + '</span>') + '\
      ' + field('地方腐败', '<input type="range" data-f="corruptionLocal" min="0" max="100" step="1" value="' + d.corruptionLocal + '" /><span class="me-rng">' + d.corruptionLocal + '</span>') + '\
      \
      <div class="me-divider">属·势力 (faction)</div>\
      ' + renderFactionPicker(d) + '\
      \
      <div class="me-divider">autonomy·自治</div>\
      ' + renderAutonomy(d.autonomy) + '\
      \
      <div class="me-divider">permissions·4 类权限</div>\
      ' + permRows + '\
    ';
  }

  // ── history tab (phase 3·full impl) ───────────────────────
  function renderHistory(d){
    var tl = (d.timeline || []).slice().sort(function(a,b){ return a.year - b.year; });
    var srcs = d.sources || [];

    var snapsHtml = tl.length === 0
      ? '<div class="me-tip">(无 timeline 快照·可点 [+ 加快照] 写入)</div>'
      : tl.map(function(s, i){
          var keys = Object.keys(s).filter(function(k){ return k !== 'year'; });
          return '\
            <div class="me-tl-row" data-tl-year="' + s.year + '">\
              <div class="me-tl-row-hdr">\
                <span class="me-tl-year">' + s.year + '</span>\
                <span class="me-tl-keys">' + keys.length + ' 字段</span>\
                <button class="me-tl-edit" data-tl-edit="' + s.year + '" title="编">✎</button>\
                <button class="me-tl-del" data-tl-del="' + s.year + '" title="删">×</button>\
              </div>\
              <div class="me-tl-summary">' + summarizeSnapshot(s) + '</div>\
            </div>';
        }).join('');

    var srcsHtml = srcs.length === 0
      ? '<div class="me-tip">(无史源·点 [+ 加考据] 写入)</div>'
      : srcs.map(function(s, i){
          return '\
            <div class="me-src-row">\
              <div class="me-src-row-hdr">\
                <span class="me-src-title">' + esc(s.title || '(无名)') + (s.juan ? ' 卷' + esc(s.juan) : '') + '</span>\
                <button class="me-src-del" data-src-del="' + i + '" title="删">×</button>\
              </div>\
              ' + (s.author ? '<div class="me-src-meta">作者·' + esc(s.author) + '</div>' : '') + '\
              ' + (s.page ? '<div class="me-src-meta">页·' + esc(s.page) + '</div>' : '') + '\
              ' + (s.year ? '<div class="me-src-meta">年·' + esc(s.year) + '</div>' : '') + '\
              ' + (s.note ? '<div class="me-src-note">' + esc(s.note) + '</div>' : '') + '\
            </div>';
        }).join('');

    return '\
      ' + field('establishedYear·设置年', '<input type="number" data-f="establishedYear" value="' + (d.establishedYear || '') + '" placeholder="-1600 ~ 1949" />') + '\
      ' + field('abolishedYear·废止年', '<input type="number" data-f="abolishedYear" value="' + (d.abolishedYear || '') + '" placeholder="(空 = 一直在)" />') + '\
      ' + field('renamedFrom·改自', '<input type="text" data-f="renamedFrom" value="' + esc(d.renamedFrom) + '" placeholder="(可选) 此省前名" />') + '\
      ' + field('renamedTo·改至', '<input type="text" data-f="renamedTo" value="' + esc(d.renamedTo) + '" placeholder="(可选) 此省后名" />') + '\
      \
      <div class="me-divider">timeline·快照 ' + tl.length + ' 条</div>\
      <div class="me-actions" style="margin-bottom:6px;">\
        <button class="me-btn me-btn-warn" data-act="add-snapshot">+ 加快照</button>\
        <button class="me-btn" data-act="capture-now">捕快现状</button>\
      </div>\
      <div class="me-tl-list">' + snapsHtml + '</div>\
      \
      <div class="me-divider">sources·历史考据 ' + srcs.length + ' 条</div>\
      <div class="me-actions" style="margin-bottom:6px;">\
        <button class="me-btn me-btn-warn" data-act="add-source">+ 加考据</button>\
      </div>\
      <div class="me-src-list">' + srcsHtml + '</div>\
    ';
  }

  function summarizeSnapshot(s){
    var parts = [];
    if (s.name)       parts.push('改名→' + esc(s.name));
    if (s.level)      parts.push('级→' + esc(s.level));
    if (s.governor)   parts.push('当任→' + esc(s.governor));
    if (s.autonomy && s.autonomy.type) parts.push('自治→' + esc(s.autonomy.type));
    if (s.polygon)    parts.push('改界·' + s.polygon.length + ' 顶');
    if (s.abolishedYear) parts.push('废止');
    if (parts.length === 0) parts.push('(无可显字段)');
    return parts.join(' · ');
  }

  // ── flags tab ─────────────────────────────────────────────
  function renderFlags(d){
    var flags = [
      { key: 'isCapital',    label: '都城 capital' },
      { key: 'isFrontier',   label: '边镇 frontier' },
      { key: 'isJunDi',      label: '军镇 garrison' },
      { key: 'isTunTian',    label: '屯田 tuntian' },
      { key: 'isTradePort',  label: '商埠 trade port' },
      { key: 'isPiao',       label: '流放地 exile' },
      { key: 'isPilgrim',    label: '宗教圣地 pilgrim' },
      { key: 'isHistoric',   label: '历史名城 historic' },
      { key: 'isDeposit',    label: '矿藏 deposit' }
    ];
    return flags.map(function(f){
      var ck = d[f.key] ? ' checked' : '';
      return '<label class="me-flag"><input type="checkbox" data-f="' + f.key + '"' + ck + ' /> ' + f.label + '</label>';
    }).join('');
  }

  // ─── partial renderers ────────────────────────────────────

  function renderTerrain(cur){
    return '<select data-f="terrain">' + TERRAIN_OPTS.map(function(o){
      return '<option value="' + o + '"' + (o === cur ? ' selected' : '') + '>' + o + '</option>';
    }).join('') + '</select>';
  }

  // 在灾行·6 类灾种 × 严重度 × 起始回合 + 备注·data-dis-* 由 bindSingle 接
  var DISASTER_TYPES = [
    { val: 'drought',    label: '旱' },
    { val: 'flood',      label: '水' },
    { val: 'plague',     label: '瘟' },
    { val: 'locust',     label: '蝗' },
    { val: 'earthquake', label: '震' },
    { val: 'cold',       label: '寒' }
  ];
  function renderDisasterRows(arr){
    if (!arr || !arr.length){
      return '<div class="me-dis-empty">(无在灾·点 + 添灾)</div>';
    }
    return arr.map(function(rec, i){
      rec = rec || {};
      var typeOpts = DISASTER_TYPES.map(function(t){
        return '<option value="' + t.val + '"' + (rec.type === t.val ? ' selected' : '') + '>' + t.label + '</option>';
      }).join('');
      var sev = rec.severity || 1;
      var sevOpts = [1,2,3].map(function(s){
        var lbl = s===1?'轻':s===2?'中':'重';
        return '<option value="' + s + '"' + (sev===s ? ' selected' : '') + '>' + lbl + '</option>';
      }).join('');
      return '<div class="me-dis-row" data-dis-idx="' + i + '">' +
        '<select class="me-dis-type">' + typeOpts + '</select>' +
        '<select class="me-dis-sev">' + sevOpts + '</select>' +
        '<input class="me-dis-turn" type="number" min="1" placeholder="回合" value="' + (rec.startTurn || '') + '" />' +
        '<input class="me-dis-note" type="text" placeholder="备注" value="' + esc(rec.note || '') + '" />' +
        '<button class="me-dis-del" data-dis-del="' + i + '" type="button" title="删">×</button>' +
        '</div>';
    }).join('');
  }

  // Phase 25.5·faction 选择器·下拉 + 载朝代预置 + 治下统计
  function renderFactionPicker(d){
    var F = TM.MapEditor.factions;
    var FP = TM.MapEditor.factionPresets;
    var list = F ? F.list() : [];
    var current = d.factionId || '';
    var opts = '<option value="">(无 / fallback autonomy)</option>' +
      list.map(function(f){
        return '<option value="' + esc(f.id) + '"' +
          (f.id === current ? ' selected' : '') + '>' +
          esc(f.name) + (f.shortName ? ' (' + esc(f.shortName) + ')' : '') +
          '</option>';
      }).join('');

    var preview = '';
    if (current){
      var f = F.get(current);
      if (f){
        var stats = F.statsByFaction(f.id);
        preview = '<div style="margin-top:4px;padding:6px 8px;background:rgba(60,50,40,0.04);border-left:3px solid ' + f.color + ';font-size:11px;color:#5a4028;">' +
          '<span style="display:inline-block;width:14px;height:14px;background:' + f.color + ';border:1px solid rgba(0,0,0,0.3);vertical-align:middle;margin-right:6px;"></span>' +
          '<b>' + esc(f.name) + '</b>·治 <b>' + stats.count + '</b> 省·' +
          (f.desc ? '<span style="color:#7a5a3a;">' + esc(f.desc) + '</span>' : '') +
          '</div>';
      }
    }

    var presetBtn = '';
    if (FP && FP.listFor){
      var dyn = ME.EDITOR.map.dynasty;
      var presetCnt = FP.listFor(dyn).length;
      if (presetCnt){
        presetBtn = '<button class="me-btn" data-act="load-faction-preset" style="margin-top:4px;font-size:11px;">载 ' + esc(dyn) + ' 朝预置 (' + presetCnt + ' 势力)</button>';
      }
    }

    return field('属·势力', '<select data-f="factionId">' + opts + '</select>') +
      preview +
      presetBtn;
  }

  function renderAutonomy(a){
    a = a || { type: 'zhixia' };
    var typeOpts = AUTONOMY_OPTS.map(function(o){
      return '<option value="' + o.v + '"' + (o.v === a.type ? ' selected' : '') + '>' + o.l + '</option>';
    }).join('');
    var subOpts = AUTONOMY_SUBTYPE_OPTS.map(function(o){
      return '<option value="' + o.v + '"' + (o.v === (a.subtype || '') ? ' selected' : '') + '>' + o.l + '</option>';
    }).join('');
    return '\
      <div class="me-aut-row">\
        <select data-f="autonomy.type">' + typeOpts + '</select>\
        <select data-f="autonomy.subtype">' + subOpts + '</select>\
      </div>\
      ' + field('受封者', '<input type="text" data-f="autonomy.holder" value="' + esc(a.holder || '') + '" placeholder="封侯 / 节度使 / 土司·派系名" />') + '\
      ' + field('宗主', '<input type="text" data-f="autonomy.suzerain" value="' + esc(a.suzerain || '') + '" placeholder="(可选) 宗主派系" />') + '\
      ' + field('忠诚 0-100', '<input type="range" data-f="autonomy.loyalty" min="0" max="100" step="1" value="' + (a.loyalty || 80) + '" /><span class="me-rng">' + (a.loyalty || 80) + '</span>') + '\
      ' + field('贡率 0-1', '<input type="number" data-f="autonomy.tributeRate" value="' + (a.tributeRate || 0) + '" min="0" max="1" step="0.01" />') + '\
    ';
  }

  // 渲染 ratio map (族群 / 信仰)·支持加 / 删 / 编 key-value
  function renderRatioMap(fieldName, currentMap, presets){
    var entries = Object.keys(currentMap || {}).map(function(k){
      return { k: k, v: currentMap[k] };
    });
    var sum = entries.reduce(function(s, e){ return s + (Number(e.v) || 0); }, 0);
    var sumColor = Math.abs(sum - 1) < 0.01 ? '#6a9a7f' : (Math.abs(sum - 1) < 0.05 ? '#c9a96e' : '#dc4f3a');

    var rowsHtml = entries.map(function(e, i){
      return '\
        <div class="me-ratio-row" data-ratio-row="' + i + '">\
          <input type="text" class="me-ratio-k" value="' + esc(e.k) + '" data-rmap-field="' + fieldName + '" data-rmap-key="' + esc(e.k) + '" data-rmap-attr="key" />\
          <input type="number" class="me-ratio-v" value="' + e.v + '" min="0" max="1" step="0.01" data-rmap-field="' + fieldName + '" data-rmap-key="' + esc(e.k) + '" data-rmap-attr="val" />\
          <button class="me-ratio-del" data-rmap-field="' + fieldName + '" data-rmap-key="' + esc(e.k) + '" title="删此项">×</button>\
        </div>\
      ';
    }).join('');

    var presetOpts = presets.map(function(p){ return '<option value="' + p + '">' + p + '</option>'; }).join('');

    return '\
      <div class="me-ratio-wrap">\
        ' + rowsHtml + '\
        <div class="me-ratio-add">\
          <select data-rmap-add-field="' + fieldName + '" class="me-ratio-add-key">\
            <option value="">+ 加</option>' + presetOpts + '\
          </select>\
        </div>\
        <div class="me-ratio-sum" style="color:' + sumColor + '">∑ = ' + sum.toFixed(3) + (sum === 1 ? ' ✓' : ' (应=1)') + '</div>\
      </div>\
    ';
  }

  // ─── helpers ──────────────────────────────────────────────

  function field(label, control){
    return '<div class="me-field"><label class="me-label">' + label + '</label><div class="me-ctrl">' + control + '</div></div>';
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  // ─── single bind ──────────────────────────────────────────

  function bindSingle(d){
    // tab switch
    _container.querySelectorAll('.me-tab').forEach(function(b){
      b.addEventListener('click', function(){
        _activeTab = b.getAttribute('data-tab');
        render();
      });
    });

    // header actions
    var btn;
    if ((btn = _container.querySelector('[data-act="dup"]'))){
      btn.addEventListener('click', function(){
        var copy = TM.MapEditor.createDivision(JSON.parse(JSON.stringify(d)));
        copy.id = 'div_' + Date.now() + '_' + Math.floor(Math.random()*9999);
        copy.name = d.name + '·副';
        copy.polygon = (d.polygon || []).map(function(p){ return [p[0] + 20, p[1] + 20]; });
        ME.recomputeDerived(copy);
        ME.addDivision(copy);
        ME.selectOne(copy.id);
      });
    }
    if ((btn = _container.querySelector('[data-act="del"]'))){
      btn.addEventListener('click', function(){
        if (!confirm('删除省 「' + d.name + '」?')) return;
        ME.removeDivision(d.id);
      });
    }
    if ((btn = _container.querySelector('[data-act="recompute"]'))){
      btn.addEventListener('click', function(){
        ME.commitMutation('recompute geom', function(){
          ME.recomputeDerived(d);
        });
      });
    }
    if ((btn = _container.querySelector('[data-act="cross-view"]'))){
      btn.addEventListener('click', function(){
        if (TM.MapEditor.atlas){
          TM.MapEditor.atlas.openPlaceHistory(d);
        }
      });
    }
    if ((btn = _container.querySelector('[data-act="add-exclave"]'))){
      btn.addEventListener('click', function(){
        ME.setTool('addPoly');
        var statusEl = document.getElementById('status-tip');
        if (statusEl) statusEl.textContent = '加飞地·' + d.name + '·点顶·近首点闭合·ESC 取消';
      });
    }
    if ((btn = _container.querySelector('[data-act="add-hole"]'))){
      btn.addEventListener('click', function(){
        ME.setTool('addHole');
        var statusEl = document.getElementById('status-tip');
        if (statusEl) statusEl.textContent = '加圈·' + d.name + '·圈应在主 polygon 内·点顶·近首点闭合';
      });
    }
    // 删某个飞地
    _container.querySelectorAll('[data-exclave-del]').forEach(function(b){
      b.addEventListener('click', function(){
        var idx = Number(b.getAttribute('data-exclave-del'));
        if (!confirm('删飞地 #' + (idx + 1) + ' (' + d.name + ')?')) return;
        ME.commitMutation('remove exclave', function(){
          d.extraPolygons.splice(idx, 1);
          ME.recomputeDerived(d);
        });
      });
    });
    // 删某个圈
    _container.querySelectorAll('[data-hole-del]').forEach(function(b){
      b.addEventListener('click', function(){
        var idx = Number(b.getAttribute('data-hole-del'));
        if (!confirm('删圈 #' + (idx + 1) + ' (' + d.name + ')? 圈所在区将复归此省领土')) return;
        ME.commitMutation('remove hole', function(){
          d.holes.splice(idx, 1);
          ME.recomputeDerived(d);
        });
      });
    });

    // disasterRecord·添 / 删 / 改
    var disAddBtn = _container.querySelector('[data-act="add-disaster"]');
    if (disAddBtn) disAddBtn.addEventListener('click', function(){
      var arr = (d.economyBase && d.economyBase.disasterRecord) || [];
      var newArr = arr.slice();
      newArr.push({ type: 'drought', severity: 1 });
      applyFieldOnDiv(d, 'economyBase.disasterRecord', newArr);
      render();
    });
    _container.querySelectorAll('[data-dis-del]').forEach(function(b){
      b.addEventListener('click', function(){
        var idx = Number(b.getAttribute('data-dis-del'));
        var arr = (d.economyBase && d.economyBase.disasterRecord) || [];
        var newArr = arr.slice();
        newArr.splice(idx, 1);
        applyFieldOnDiv(d, 'economyBase.disasterRecord', newArr);
        render();
      });
    });
    function _rebuildDisasters(){
      var rows = _container.querySelectorAll('.me-dis-row');
      var arr = [];
      rows.forEach(function(row){
        var typ = (row.querySelector('.me-dis-type') || {}).value || '';
        var sev = Number((row.querySelector('.me-dis-sev') || {}).value || 1);
        var turn = Number((row.querySelector('.me-dis-turn') || {}).value || 0);
        var note = (row.querySelector('.me-dis-note') || {}).value || '';
        if (!typ) return;
        var rec = { type: typ, severity: sev };
        if (turn > 0) rec.startTurn = turn;
        if (note) rec.note = note;
        arr.push(rec);
      });
      applyFieldOnDiv(d, 'economyBase.disasterRecord', arr);
    }
    _container.querySelectorAll('.me-dis-row select, .me-dis-row input').forEach(function(el){
      el.addEventListener('change', _rebuildDisasters);
      if (el.tagName === 'INPUT') el.addEventListener('blur', _rebuildDisasters);
    });

    // field bind
    _container.querySelectorAll('[data-f]').forEach(function(input){
      var key = input.getAttribute('data-f');
      var rng = input.parentElement.querySelector('.me-rng');
      var handler = function(){
        var v;
        if (input.type === 'checkbox') v = input.checked;
        else if (input.type === 'number') v = (input.value === '' ? null : Number(input.value));
        else v = input.value;
        if (rng) rng.textContent = v;
        applyFieldOnDiv(d, key, v);
      };
      input.addEventListener('input', function(){
        if (input.type === 'range' && rng) rng.textContent = input.value;
      });
      input.addEventListener('change', handler);
      if (input.tagName === 'INPUT' && (input.type === 'text' || input.type === 'number')){
        input.addEventListener('blur', handler);
      }
      if (input.tagName === 'TEXTAREA'){
        input.addEventListener('blur', handler);
      }
    });

    // Phase 25.5·load faction preset 按钮
    var loadPresetBtn = _container.querySelector('[data-act="load-faction-preset"]');
    if (loadPresetBtn){
      loadPresetBtn.addEventListener('click', function(){
        var FP = TM.MapEditor.factionPresets;
        if (!FP) return;
        FP.loadFor(ME.EDITOR.map.dynasty, { replace: false });
        // 重渲面板 + canvas
        render();
        if (ME.requestRender) ME.requestRender();
      });
    }

    // timeline ops
    var tlAddBtn = _container.querySelector('[data-act="add-snapshot"]');
    if (tlAddBtn) tlAddBtn.addEventListener('click', function(){ openSnapshotModal(d, null); });
    var tlCaptBtn = _container.querySelector('[data-act="capture-now"]');
    if (tlCaptBtn) tlCaptBtn.addEventListener('click', function(){
      var year = prompt('捕快现状·写入哪年? (default = 当前 viewYear 或 dynasty 起年)', String(getDefaultYearForDiv(d)));
      if (!year) return;
      var y = Number(year);
      if (isNaN(y)){ meAlert('年份非数字'); return; }
      TM.MapEditor.timeline.captureNow(d.id, y);
    });
    _container.querySelectorAll('[data-tl-edit]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var y = Number(btn.getAttribute('data-tl-edit'));
        var s = (d.timeline || []).find(function(S){ return S.year === y; });
        if (s) openSnapshotModal(d, s);
      });
    });
    _container.querySelectorAll('[data-tl-del]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var y = Number(btn.getAttribute('data-tl-del'));
        if (!confirm('删 ' + y + ' 年快照?')) return;
        TM.MapEditor.timeline.removeSnapshot(d.id, y);
      });
    });

    // sources ops
    var srcAddBtn = _container.querySelector('[data-act="add-source"]');
    if (srcAddBtn) srcAddBtn.addEventListener('click', function(){ openSourceModal(d); });
    _container.querySelectorAll('[data-src-del]').forEach(function(btn){
      btn.addEventListener('click', function(){
        var idx = Number(btn.getAttribute('data-src-del'));
        if (!confirm('删此考据?')) return;
        TM.MapEditor.timeline.removeSource(d.id, idx);
      });
    });

    // ratio map bind
    _container.querySelectorAll('[data-rmap-field]').forEach(function(input){
      var fld = input.getAttribute('data-rmap-field');
      var key = input.getAttribute('data-rmap-key');
      var attr = input.getAttribute('data-rmap-attr');

      if (input.classList.contains('me-ratio-del')){
        input.addEventListener('click', function(){
          var m = Object.assign({}, d[fld] || {});
          delete m[key];
          var patch = {}; patch[fld] = m;
          ME.updateDivision(d.id, patch, 'remove ratio ' + fld + '.' + key);
        });
      } else if (attr === 'key'){
        input.addEventListener('blur', function(){
          var newKey = input.value.trim();
          if (newKey === key) return;
          var m = Object.assign({}, d[fld] || {});
          m[newKey] = m[key];
          delete m[key];
          var patch = {}; patch[fld] = m;
          ME.updateDivision(d.id, patch, 'rename ratio key');
        });
      } else if (attr === 'val'){
        input.addEventListener('blur', function(){
          var v = Number(input.value) || 0;
          var m = Object.assign({}, d[fld] || {});
          m[key] = v;
          var patch = {}; patch[fld] = m;
          ME.updateDivision(d.id, patch, 'edit ratio val');
        });
      }
    });

    // ratio add
    _container.querySelectorAll('[data-rmap-add-field]').forEach(function(sel){
      sel.addEventListener('change', function(){
        var fld = sel.getAttribute('data-rmap-add-field');
        var k = sel.value;
        if (!k) return;
        var m = Object.assign({}, d[fld] || {});
        if (m[k] != null){ meAlert('已存在 "' + k + '"'); sel.value=''; return; }
        m[k] = 0;
        var patch = {}; patch[fld] = m;
        ME.updateDivision(d.id, patch, 'add ratio ' + k);
        sel.value = '';
      });
    });
  }

  // ─── deep path apply ──────────────────────────────────────

  function applyFieldOnDiv(d, key, value){
    var path = key.split('.');
    if (path.length === 1){
      var patch = {}; patch[key] = value;
      ME.updateDivision(d.id, patch, 'edit ' + key);
      return;
    }
    // build patched copy of top-level field
    var top = path[0];
    var cur = JSON.parse(JSON.stringify(d[top] || {}));
    var node = cur;
    for (var i = 1; i < path.length - 1; i++){
      if (!node[path[i]]) node[path[i]] = {};
      node = node[path[i]];
    }
    node[path[path.length - 1]] = value;
    var p = {}; p[top] = cur;
    ME.updateDivision(d.id, p, 'edit ' + key);
  }

  // 直接 mutate (用于 batch·已经在 commitMutation 里)
  function applyDeepPath(d, key, value){
    var path = key.split('.');
    if (path.length === 1){ d[key] = value; return; }
    var node = d;
    for (var i = 0; i < path.length - 1; i++){
      if (!node[path[i]]) node[path[i]] = {};
      node = node[path[i]];
    }
    node[path[path.length - 1]] = value;
  }

  // ─── snapshot / source modals ────────────────────────────

  var _modalEl = null;
  function ensureModal(){
    if (_modalEl) return _modalEl;
    _modalEl = document.createElement('div');
    _modalEl.className = 'me-snap-modal';
    _modalEl.style.cssText = 'position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:9999; background:#1a1a1f; border:1px solid #3a3530; border-radius:6px; padding:14px 18px; min-width:380px; max-width:560px; font-family:inherit; color:#e8ddc8; box-shadow:0 8px 30px rgba(0,0,0,0.6); display:none;';
    document.body.appendChild(_modalEl);
    return _modalEl;
  }

  function openSnapshotModal(div, existing){
    var modal = ensureModal();
    var isEdit = !!existing;
    var s = existing || { year: getDefaultYearForDiv(div) };

    modal.innerHTML = '\
      <div style="font-size:14px; color:#c9a96e; margin-bottom:10px;">' + (isEdit ? '编辑' : '新加') + ' timeline 快照</div>\
      <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 10px; margin-bottom:10px;">\
        <span style="font-size:11px; color:#6a6560;">年份 *</span>\
        <input type="number" id="snap-year" value="' + s.year + '"' + (isEdit ? ' disabled' : '') + ' style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;" />\
        <span style="font-size:11px; color:#6a6560;">改名→</span>\
        <input type="text" id="snap-name" value="' + esc(s.name || '') + '" placeholder="(可选)" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;" />\
        <span style="font-size:11px; color:#6a6560;">当任→</span>\
        <input type="text" id="snap-governor" value="' + esc(s.governor || '') + '" placeholder="(可选) 此年新当任" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;" />\
        <span style="font-size:11px; color:#6a6560;">dejureOwner→</span>\
        <input type="text" id="snap-owner" value="' + esc(s.dejureOwner || '') + '" placeholder="(可选) 此年新归属" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;" />\
        <span style="font-size:11px; color:#6a6560;">autonomy.type→</span>\
        <select id="snap-aut" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;">\
          <option value="">(不改)</option>\
          ' + AUTONOMY_OPTS.map(function(o){
            return '<option value="' + o.v + '"' + (s.autonomy && s.autonomy.type === o.v ? ' selected' : '') + '>' + o.l + '</option>';
          }).join('') + '\
        </select>\
        <span style="font-size:11px; color:#6a6560;">废止·此年废</span>\
        <label style="font-size:11px;"><input type="checkbox" id="snap-abolish"' + (s.abolishedYear ? ' checked' : '') + ' /> 此年起废止</label>\
        <span style="font-size:11px; color:#6a6560;">备注</span>\
        <textarea id="snap-note" rows="2" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;" placeholder="(可选) note">' + esc(s.note || '') + '</textarea>\
      </div>\
      <div style="display:flex; gap:8px; justify-content:flex-end;">\
        <button class="me-btn" id="snap-cancel">取消</button>\
        <button class="me-btn me-btn-warn" id="snap-save">' + (isEdit ? '保存' : '加') + '</button>\
      </div>\
    ';
    modal.style.display = 'block';

    document.getElementById('snap-cancel').addEventListener('click', function(){ modal.style.display = 'none'; });
    document.getElementById('snap-save').addEventListener('click', function(){
      var y = Number(document.getElementById('snap-year').value);
      if (isNaN(y)){ meAlert('年份必填'); return; }
      var snap = { year: y };
      var name = document.getElementById('snap-name').value.trim();
      if (name) snap.name = name;
      var gov = document.getElementById('snap-governor').value.trim();
      if (gov) snap.governor = gov;
      var owner = document.getElementById('snap-owner').value.trim();
      if (owner) snap.dejureOwner = owner;
      var aut = document.getElementById('snap-aut').value;
      if (aut){
        snap.autonomy = Object.assign({}, div.autonomy || {}, { type: aut });
      }
      if (document.getElementById('snap-abolish').checked){
        snap.abolishedYear = y;
      }
      var note = document.getElementById('snap-note').value.trim();
      if (note) snap.note = note;
      TM.MapEditor.timeline.addSnapshot(div.id, snap);
      modal.style.display = 'none';
    });
  }

  function openSourceModal(div){
    var modal = ensureModal();
    modal.innerHTML = '\
      <div style="font-size:14px; color:#c9a96e; margin-bottom:10px;">加历史考据</div>\
      <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 10px; margin-bottom:10px;">\
        <span style="font-size:11px; color:#6a6560;">title *</span>\
        <input type="text" id="src-title" placeholder="《明史·地理志》" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;" />\
        <span style="font-size:11px; color:#6a6560;">author</span>\
        <input type="text" id="src-author" placeholder="(可选) 张廷玉" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;" />\
        <span style="font-size:11px; color:#6a6560;">juan·卷</span>\
        <input type="text" id="src-juan" placeholder="(可选) 42" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;" />\
        <span style="font-size:11px; color:#6a6560;">page</span>\
        <input type="text" id="src-page" placeholder="(可选) 1024" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;" />\
        <span style="font-size:11px; color:#6a6560;">year</span>\
        <input type="number" id="src-year" placeholder="(可选) 引用对象年份" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;" />\
        <span style="font-size:11px; color:#6a6560;">note</span>\
        <textarea id="src-note" rows="3" placeholder="(可选) 摘录原文 / 分析" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;"></textarea>\
      </div>\
      <div style="display:flex; gap:8px; justify-content:flex-end;">\
        <button class="me-btn" id="src-cancel">取消</button>\
        <button class="me-btn me-btn-warn" id="src-save">加</button>\
      </div>\
    ';
    modal.style.display = 'block';

    document.getElementById('src-cancel').addEventListener('click', function(){ modal.style.display = 'none'; });
    document.getElementById('src-save').addEventListener('click', function(){
      var t = document.getElementById('src-title').value.trim();
      if (!t){ meAlert('title 必填'); return; }
      var src = { title: t };
      ['author','juan','page','year','note'].forEach(function(f){
        var v = document.getElementById('src-' + f).value.trim();
        if (v){ src[f] = (f === 'year') ? Number(v) : v; }
      });
      TM.MapEditor.timeline.addSource(div.id, src);
      modal.style.display = 'none';
    });
  }

  function getDefaultYearForDiv(div){
    var TL = TM.MapEditor.timeline;
    var v = TL.getViewYear();
    if (v != null) return v;
    if (div.establishedYear) return div.establishedYear;
    var dyn = TM.MapEditor.dynasty.get(ME.EDITOR.map.dynasty);
    return dyn.yearRange ? dyn.yearRange[0] : 0;
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.panel = {
    init: init,
    render: render
  };

})(typeof window !== 'undefined' ? window : this);
