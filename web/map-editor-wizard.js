// map-editor-wizard.js
// Phase 17.1·新建 wizard·6 模板
// 替代当前 btn-new 直立 newMap·single modal·6 卡·inline params
// 模板·空白 / 底图 / 样本 / voronoi / atlas / 导入
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[wizard] core not loaded'); return; }

  var _modal = null;
  var _selectedTemplate = 'blank';

  // ─── 模板定义 ──────────────────────────────────────────

  var TEMPLATES = [
    {
      id: 'blank',
      glyph: '空',
      title: '空白',
      desc: '只选朝代·一切手画',
      paramsHTML: ''
    },
    {
      id: 'bitmap',
      glyph: '底',
      title: '从底图',
      desc: '选朝代·上传 PNG·后用·识省·或手画',
      paramsHTML:
        '<label class="me-label">底图文件</label>' +
        '<input id="wiz-bitmap-file" type="file" accept="image/*" style="background:var(--ink-3); border:1px solid var(--bd-1); color:var(--paper-1); padding:5px 8px; border-radius:var(--rd-2); width:100%; font-size:var(--fs-xs);" />' +
        '<div class="me-tip" style="margin-top:5px;">载入后底图入·canvas·建议立即 <kbd>自动识省</kbd></div>'
    },
    {
      id: 'sample',
      glyph: '範',
      title: '样本剧本',
      desc: '按朝代·placeholder polygon·快速试',
      paramsHTML:
        '<div class="me-tip">用当前 <b>朝代</b> 的内置样本·建议熟悉编辑器后再换真数据</div>'
    },
    {
      id: 'voronoi',
      glyph: '網',
      title: 'Voronoi 网',
      desc: 'N 种子·Lloyd 松弛·自动分省',
      paramsHTML:
        '<div style="display:grid; grid-template-columns:auto 1fr auto; gap:6px 10px; align-items:center;">' +
          '<label class="me-label" style="margin:0;">种子 N</label>' +
          '<input id="wiz-vor-n" type="range" min="10" max="200" step="5" value="50" />' +
          '<span class="me-rng" id="wiz-vor-n-val">50</span>' +
          '<label class="me-label" style="margin:0;">Lloyd</label>' +
          '<input id="wiz-vor-lloyd" type="range" min="0" max="20" value="5" />' +
          '<span class="me-rng" id="wiz-vor-lloyd-val">5</span>' +
        '</div>' +
        '<div class="me-tip">生成后 (17.2) 会建议·清飞地→扰边→检邻 链式</div>'
    },
    {
      id: 'atlas',
      glyph: '集',
      title: '从 atlas 集',
      desc: '跨朝代地图库·copy 一份·自定改',
      paramsHTML:
        '<div class="me-tip">点 <kbd>立</kbd> 后弹 atlas 浏览器·选 source 即载入</div>'
    },
    {
      id: 'import',
      glyph: '入',
      title: '导入剧本',
      desc: 'JSON / GeoJSON / scenario·从外部',
      paramsHTML:
        '<div class="me-tip">点 <kbd>立</kbd> 后弹文件选择·支持本编辑器导出·或外部 JSON</div>'
    }
  ];

  // ─── modal ─────────────────────────────────────────────

  function open(){
    if (!_modal){
      _modal = document.createElement('div');
      _modal.className = 'me-modal me-wizard';
      _modal.style.cssText = 'position:fixed; left:50%; top:50%; transform:translate(-50%, -50%); z-index:1000; width:680px; max-width:94vw; max-height:86vh; overflow:auto; background:linear-gradient(180deg, var(--ink-3), var(--ink-2)); border:1px solid var(--bd-1); border-radius:var(--rd-4); box-shadow:var(--sh-3); padding:var(--sp-5); display:none; font-family:var(--font-serif); color:var(--paper-1);';
      document.body.appendChild(_modal);
    }
    _selectedTemplate = 'blank';
    render();
    _modal.style.display = 'block';
  }

  function close(){
    if (_modal) _modal.style.display = 'none';
  }

  function render(){
    if (!_modal) return;
    var dyn = TM.MapEditor.dynasty.list();
    var curDyn = ME.EDITOR.map.dynasty;

    var dynOpts = dyn.map(function(d){
      return '<option value="' + d.id + '"' + (d.id === curDyn ? ' selected' : '') + '>' + escHtml(d.label) + '</option>';
    }).join('');

    var cards = TEMPLATES.map(function(t){
      var sel = t.id === _selectedTemplate;
      return '<div class="wiz-card" data-tpl="' + t.id + '" style="' +
        'cursor:pointer; padding:var(--sp-3); border:2px solid ' + (sel ? 'var(--gold-1)' : 'var(--bd-1)') + '; border-radius:var(--rd-3); ' +
        'background:' + (sel ? 'linear-gradient(180deg, var(--gold-5), var(--ink-3))' : 'var(--ink-3)') + '; ' +
        'transition:all var(--t-fast);">' +
        '<div style="display:flex; align-items:center; gap:var(--sp-3); margin-bottom:var(--sp-1);">' +
          '<span style="display:inline-flex; align-items:center; justify-content:center; width:38px; height:38px; background:' + (sel ? 'var(--gold-1)' : 'var(--ink-1)') + '; color:' + (sel ? 'var(--ink-1)' : 'var(--gold-2)') + '; border-radius:var(--rd-2); font-family:var(--font-seal); font-size:var(--fs-lg); font-weight:var(--fw-sb);">' + t.glyph + '</span>' +
          '<span style="color:' + (sel ? 'var(--gold-0)' : 'var(--paper-0)') + '; font-size:var(--fs-md); font-weight:var(--fw-sb);">' + escHtml(t.title) + '</span>' +
        '</div>' +
        '<div style="color:' + (sel ? 'var(--gold-2)' : 'var(--paper-3)') + '; font-size:var(--fs-xs); line-height:var(--lh-loose);">' + escHtml(t.desc) + '</div>' +
      '</div>';
    }).join('');

    var current = TEMPLATES.find(function(t){ return t.id === _selectedTemplate; });

    _modal.innerHTML =
      '<div class="me-modal-title">新建地图</div>' +

      // ① 模板·6 卡 grid
      '<div class="me-divider">选模板</div>' +
      '<div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:var(--sp-2); margin-bottom:var(--sp-4);">' + cards + '</div>' +

      // ② 通用 params·朝代 + 名
      '<div class="me-divider">基本</div>' +
      '<div style="display:grid; grid-template-columns:auto 1fr; gap:6px var(--sp-3); align-items:center; margin-bottom:var(--sp-3);">' +
        '<span class="me-label" style="margin:0;">朝代</span>' +
        '<select id="wiz-dynasty" class="me-tb-select" style="width:100%;">' + dynOpts + '</select>' +
        '<span class="me-label" style="margin:0;">标题</span>' +
        '<input id="wiz-title" type="text" placeholder="(可空·按朝代默)" />' +
      '</div>' +

      // ③ 模板特有 params
      (current.paramsHTML ?
        '<div class="me-divider">' + escHtml(current.title) + '·参数</div>' +
        '<div id="wiz-params" style="margin-bottom:var(--sp-3);">' + current.paramsHTML + '</div>'
        : '') +

      // ④ foot·confirm + cancel
      '<div class="me-modal-foot">' +
        '<button class="me-btn" id="wiz-cancel">取消</button>' +
        '<button class="me-btn me-btn-warn" id="wiz-go">立 (新建)</button>' +
      '</div>';

    bindEvents();
  }

  function bindEvents(){
    // 模板卡 click
    _modal.querySelectorAll('.wiz-card').forEach(function(card){
      card.addEventListener('click', function(){
        _selectedTemplate = card.getAttribute('data-tpl');
        render();
      });
    });

    // voronoi sliders
    var vN = _modal.querySelector('#wiz-vor-n');
    var vNV = _modal.querySelector('#wiz-vor-n-val');
    if (vN && vNV) vN.oninput = function(){ vNV.textContent = vN.value; };
    var vL = _modal.querySelector('#wiz-vor-lloyd');
    var vLV = _modal.querySelector('#wiz-vor-lloyd-val');
    if (vL && vLV) vL.oninput = function(){ vLV.textContent = vL.value; };

    // cancel + go
    _modal.querySelector('#wiz-cancel').addEventListener('click', close);
    _modal.querySelector('#wiz-go').addEventListener('click', execute);
  }

  // ─── execute·按选 template 走对应路径 ────────────────────

  function execute(){
    if (ME.EDITOR.dirty && !confirm('当前未保存·确认新建·当前会丢?')) return;

    var dynastyId = (_modal.querySelector('#wiz-dynasty') || {}).value || ME.EDITOR.map.dynasty;
    var title = (_modal.querySelector('#wiz-title') || {}).value || '';

    var tpl = _selectedTemplate;
    close();

    // 各 template 的 action
    if (tpl === 'blank'){
      ME.newMap(dynastyId);
      if (title) ME.EDITOR.map.title = title;
      ME.fire('mutation', { label: '新建·空白' });
      if (global.meToast) meToast('已新建·空白', 'success');
      return;
    }

    if (tpl === 'bitmap'){
      var fileInput = _modal.querySelector('#wiz-bitmap-file');
      var file = fileInput && fileInput.files && fileInput.files[0];
      ME.newMap(dynastyId);
      if (title) ME.EDITOR.map.title = title;
      if (file && ME.state){
        ME.state.handleFiles([file]);
        if (global.meToast) meToast('空地图 + 底图已载·建议·自动识省', 'success', 3500);
      } else {
        if (global.meToast) meToast('空地图·未选底图·可后再载', 'warn');
      }
      return;
    }

    if (tpl === 'sample'){
      ME.newMap(dynastyId);
      if (title) ME.EDITOR.map.title = title;
      if (TM.MapEditor.sampleGen){
        var ok = TM.MapEditor.sampleGen.loadSample(dynastyId);
        if (ok && global.meToast) meToast('样本已载·' + ME.EDITOR.map.divisions.length + ' 省', 'success');
        if (ok && TM.MapEditor.workflowChain) TM.MapEditor.workflowChain.autoPolish('sample');
      }
      return;
    }

    if (tpl === 'voronoi'){
      ME.newMap(dynastyId);
      if (title) ME.EDITOR.map.title = title;
      var n = Number((_modal.querySelector('#wiz-vor-n') || {}).value) || 50;
      var lloyd = Number((_modal.querySelector('#wiz-vor-lloyd') || {}).value) || 0;
      if (TM.MapEditor.voronoi){
        var bounds = {
          x: 0, y: 0,
          w: ME.EDITOR.map.bitmapWidth || 1280,
          h: ME.EDITOR.map.bitmapHeight || 800
        };
        var seeds = null;
        // bitmap-aware·若底图已载·先建 land mask 再 land-aware seeds
        var BS = TM.MapEditor.bitmapSeeds;
        if (BS && ME.EDITOR.bitmapImage){
          if (!BS.getMask()){
            BS.buildLandMask({ mode: 'bluedominant' });
          }
          seeds = BS.landAwarePoissonSeeds(n, bounds);
          if (global.meToast && BS.getMask()){
            meToast('陆 ' + Math.round(BS.getMask().landRatio * 100) + '% ·' + seeds.length + ' / ' + n + ' seed 落陆', 'info', 2400);
          }
        }
        if (!seeds || seeds.length < n * 0.5){
          seeds = TM.MapEditor.voronoi.poissonSeeds(n, bounds);
          if (seeds.length < n) seeds = TM.MapEditor.voronoi.randomSeeds(n, bounds);
        }
        TM.MapEditor.voronoi.generateFromSeeds({ seeds: seeds, lloyd: lloyd, strategy: 'replace', nameBase: 'V' });
        if (global.meToast) meToast('voronoi·' + n + ' cell·后链', 'success', 3000);
        if (TM.MapEditor.workflowChain) TM.MapEditor.workflowChain.autoPolish('voronoi');
      }
      return;
    }

    if (tpl === 'atlas'){
      ME.newMap(dynastyId);
      if (title) ME.EDITOR.map.title = title;
      if (TM.MapEditor.atlas && TM.MapEditor.atlas.openModal){
        TM.MapEditor.atlas.openModal();
      } else {
        if (global.meToast) meToast('atlas 模块未加载', 'error');
      }
      return;
    }

    if (tpl === 'import'){
      if (ME.io && ME.io.importJSON){
        ME.io.importJSON();
      } else {
        if (global.meToast) meToast('io.importJSON 未加载', 'error');
      }
      return;
    }
  }

  // ─── helpers ────────────────────────────────────────────

  function escHtml(s){
    return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  // ─── expose ─────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.wizard = {
    open: open,
    close: close,
    TEMPLATES: TEMPLATES
  };

})(typeof window !== 'undefined' ? window : this);
