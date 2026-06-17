// map-editor-bulk.js
// 批量 I/O·CSV import/export·Markdown 文档导出
// CSV 列·name / level / terrain / regionType / autonomy.type / autonomy.holder
//        prosperity / mouths / households / ding / minxinLocal / corruptionLocal
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[bulk] core not loaded'); return; }

  var CSV_COLS = [
    'name', 'level', 'terrain', 'regionType',
    'autonomyType', 'autonomyHolder', 'autonomyLoyalty', 'autonomyTribute',
    'prosperity', 'taxLevel', 'specialResources',
    'mouths', 'households', 'ding', 'fugitives', 'hiddenCount',
    'minxinLocal', 'corruptionLocal',
    'governor', 'officialPosition', 'dejureOwner',
    'establishedYear', 'abolishedYear',
    'crossDynastyId',
    'isCapital', 'isFrontier', 'isJunDi', 'isTradePort'
  ];

  // ─── CSV parse ──────────────────────────────────────────

  function parseCSV(text){
    var rows = [];
    var i = 0, n = text.length;
    var row = [];
    var field = '';
    var inQuote = false;

    while (i < n){
      var ch = text[i];
      if (inQuote){
        if (ch === '"'){
          if (text[i+1] === '"'){ field += '"'; i += 2; continue; }
          inQuote = false; i++; continue;
        }
        field += ch; i++;
      } else {
        if (ch === '"'){ inQuote = true; i++; continue; }
        if (ch === ','){ row.push(field); field = ''; i++; continue; }
        if (ch === '\n'){
          row.push(field); rows.push(row);
          row = []; field = '';
          i++; continue;
        }
        if (ch === '\r'){ i++; continue; }
        field += ch; i++;
      }
    }
    if (field.length || row.length){
      row.push(field);
      rows.push(row);
    }
    return rows.filter(function(r){ return r.some(function(c){ return c !== ''; }); });
  }

  function escapeCSV(s){
    if (s == null) return '';
    var str = String(s);
    if (str.indexOf(',') >= 0 || str.indexOf('"') >= 0 || str.indexOf('\n') >= 0){
      return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
  }

  // ─── division → flat row (CSV value) ────────────────────

  function divToFlat(d){
    var aut = d.autonomy || {};
    var pd = d.populationDetail || {};
    return {
      name: d.name,
      level: d.level,
      terrain: d.terrain,
      regionType: d.regionType,
      autonomyType: aut.type || 'zhixia',
      autonomyHolder: aut.holder || '',
      autonomyLoyalty: aut.loyalty != null ? aut.loyalty : '',
      autonomyTribute: aut.tributeRate != null ? aut.tributeRate : '',
      prosperity: d.prosperity != null ? d.prosperity : '',
      taxLevel: d.taxLevel || '',
      specialResources: d.specialResources || '',
      mouths: pd.mouths || '',
      households: pd.households || '',
      ding: pd.ding || '',
      fugitives: pd.fugitives || '',
      hiddenCount: pd.hiddenCount || '',
      minxinLocal: d.minxinLocal != null ? d.minxinLocal : '',
      corruptionLocal: d.corruptionLocal != null ? d.corruptionLocal : '',
      governor: d.governor || '',
      officialPosition: d.officialPosition || '',
      dejureOwner: d.dejureOwner || '',
      establishedYear: d.establishedYear != null ? d.establishedYear : '',
      abolishedYear: d.abolishedYear != null ? d.abolishedYear : '',
      crossDynastyId: d.crossDynastyId || '',
      isCapital: d.isCapital ? '1' : '',
      isFrontier: d.isFrontier ? '1' : '',
      isJunDi: d.isJunDi ? '1' : '',
      isTradePort: d.isTradePort ? '1' : ''
    };
  }

  // flat row → division opts (sample-gen 风·user 后期画 polygon)
  function flatToDiv(row){
    var opts = {
      name: row.name || '未名',
      level: row.level || 'province',
      terrain: row.terrain || '平原',
      regionType: row.regionType || 'normal',
      autonomy: {
        type: row.autonomyType || 'zhixia',
        subtype: '',
        holder: row.autonomyHolder || '',
        suzerain: '',
        loyalty: row.autonomyLoyalty != null && row.autonomyLoyalty !== '' ? Number(row.autonomyLoyalty) : 80,
        tributeRate: row.autonomyTribute != null && row.autonomyTribute !== '' ? Number(row.autonomyTribute) : 0
      },
      prosperity: row.prosperity != null && row.prosperity !== '' ? Number(row.prosperity) : 50,
      taxLevel: row.taxLevel || '中',
      specialResources: row.specialResources || '',
      populationDetail: {
        mouths: row.mouths != null && row.mouths !== '' ? Number(row.mouths) : 0,
        households: row.households != null && row.households !== '' ? Number(row.households) : 0,
        ding: row.ding != null && row.ding !== '' ? Number(row.ding) : 0,
        fugitives: row.fugitives != null && row.fugitives !== '' ? Number(row.fugitives) : 0,
        hiddenCount: row.hiddenCount != null && row.hiddenCount !== '' ? Number(row.hiddenCount) : 0
      },
      minxinLocal: row.minxinLocal != null && row.minxinLocal !== '' ? Number(row.minxinLocal) : 60,
      corruptionLocal: row.corruptionLocal != null && row.corruptionLocal !== '' ? Number(row.corruptionLocal) : 30,
      governor: row.governor || '',
      officialPosition: row.officialPosition || '',
      dejureOwner: row.dejureOwner || '',
      establishedYear: row.establishedYear != null && row.establishedYear !== '' ? Number(row.establishedYear) : null,
      abolishedYear: row.abolishedYear != null && row.abolishedYear !== '' ? Number(row.abolishedYear) : null,
      crossDynastyId: row.crossDynastyId || '',
      isCapital: row.isCapital === '1' || row.isCapital === 'true',
      isFrontier: row.isFrontier === '1' || row.isFrontier === 'true',
      isJunDi: row.isJunDi === '1' || row.isJunDi === 'true',
      isTradePort: row.isTradePort === '1' || row.isTradePort === 'true'
    };
    return opts;
  }

  // ─── CSV export ─────────────────────────────────────────

  function exportCSV(){
    var divs = ME.EDITOR.map.divisions;
    var lines = [CSV_COLS.join(',')];
    divs.forEach(function(d){
      var flat = divToFlat(d);
      var row = CSV_COLS.map(function(col){ return escapeCSV(flat[col]); });
      lines.push(row.join(','));
    });
    var data = lines.join('\n');
    var name = (ME.EDITOR.map.dynasty || 'map') + '-' + new Date().toISOString().slice(0,10) + '.csv';
    if (ME.io && ME.io.download) ME.io.download(name, data, 'text/csv');
  }

  // ─── CSV import ─────────────────────────────────────────

  function importCSV(){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,.tsv,text/csv,text/tab-separated-values';
    input.onchange = function(e){
      var f = e.target.files && e.target.files[0];
      if (!f) return;
      var reader = new FileReader();
      reader.onload = function(ev){
        try {
          var rows = parseCSV(ev.target.result);
          if (rows.length === 0){ meAlert('CSV 空·或解析失败'); return; }
          var headers = rows[0];
          var dataRows = rows.slice(1);

          // headers 映射·按 CSV_COLS·允许部分子集·缺的字段使用 default
          var indices = {};
          headers.forEach(function(h, i){
            var key = h.trim();
            if (CSV_COLS.indexOf(key) !== -1) indices[key] = i;
          });

          if (!indices.name && indices.name !== 0){
            meAlert('CSV 需有 name 列·当前 headers·' + headers.join(','));
            return;
          }

          previewCSVImport(dataRows, indices);
        } catch(err){
          console.error('[bulk] CSV import fail:', err);
          meAlert('CSV 解析失败·' + err.message);
        }
      };
      reader.readAsText(f);
    };
    input.click();
  }

  function previewCSVImport(dataRows, indices){
    var modal = ensureModal();
    var nValid = dataRows.filter(function(r){
      return r[indices.name] && r[indices.name].trim();
    }).length;

    var sampleHtml = dataRows.slice(0, 8).map(function(r, i){
      var name = r[indices.name] || '?';
      var level = indices.level != null ? r[indices.level] : '?';
      var aut = indices.autonomyType != null ? r[indices.autonomyType] : '?';
      return '<div style="display:grid; grid-template-columns:30px 1fr auto auto; gap:8px; padding:4px 6px; border-bottom:1px solid #2a2a30; font-size:11px;">\
        <span style="color:#6a6560;">#' + (i+1) + '</span>\
        <span>' + esc(name) + '</span>\
        <span style="color:#a8a098; font-size:10px;">' + esc(level) + '</span>\
        <span style="color:#a8a098; font-size:10px;">' + esc(aut) + '</span>\
      </div>';
    }).join('');

    modal.innerHTML = '\
      <div style="font-size:14px; color:#c9a96e; margin-bottom:6px;">CSV 导入预览·' + nValid + ' 行有效</div>\
      <div style="font-size:11px; color:#6a6560; margin-bottom:10px;">前 8 行示例·确认后导入·polygon 用 placeholder hex (后期 P 工具改)</div>\
      <div style="border:1px solid #3a3530; border-radius:3px; max-height:240px; overflow:auto; margin-bottom:10px;">' + sampleHtml + '</div>\
      <div style="display:grid; grid-template-columns:auto 1fr; gap:6px 10px; margin-bottom:10px; align-items:center;">\
        <span style="font-size:11px; color:#6a6560;">导入策略</span>\
        <select id="bulk-strategy" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;">\
          <option value="add">追加·保留现有省</option>\
          <option value="replace">替换·清空现有所有省</option>\
        </select>\
        <span style="font-size:11px; color:#6a6560;">polygon</span>\
        <select id="bulk-poly" style="background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:4px 8px; border-radius:3px; font-family:inherit;">\
          <option value="hex">hex 网格 placeholder (后期画)</option>\
          <option value="empty">空 polygon (用 P 工具画)</option>\
        </select>\
      </div>\
      <div style="display:flex; gap:8px; justify-content:flex-end;">\
        <button class="me-btn" id="bulk-cancel">取消</button>\
        <button class="me-btn me-btn-warn" id="bulk-go">导入 ' + nValid + ' 省</button>\
      </div>\
    ';
    modal.style.display = 'block';

    document.getElementById('bulk-cancel').onclick = function(){ modal.style.display = 'none'; };
    document.getElementById('bulk-go').onclick = function(){
      var strategy = document.getElementById('bulk-strategy').value;
      var polyMode = document.getElementById('bulk-poly').value;
      modal.style.display = 'none';
      doCSVImport(dataRows, indices, strategy, polyMode);
    };
  }

  function doCSVImport(dataRows, indices, strategy, polyMode){
    var newDivs = [];
    var w = ME.EDITOR.map.bitmapWidth || 1280;
    var h = ME.EDITOR.map.bitmapHeight || 800;
    var n = dataRows.filter(function(r){ return r[indices.name] && r[indices.name].trim(); }).length;
    var cols = Math.ceil(Math.sqrt(n));
    var rows = Math.ceil(n / cols);
    var cellW = w / (cols + 1);
    var cellH = h / (rows + 1);
    var idx = 0;

    dataRows.forEach(function(r){
      if (!r[indices.name] || !r[indices.name].trim()) return;
      var row = {};
      Object.keys(indices).forEach(function(col){
        row[col] = r[indices[col]];
      });
      var opts = flatToDiv(row);
      // 生成 polygon
      if (polyMode === 'hex'){
        var col = idx % cols;
        var rowI = Math.floor(idx / cols);
        var cx = (col + 1) * cellW;
        var cy = (rowI + 1) * cellH;
        var radius = Math.min(cellW, cellH) * 0.42;
        var poly = [];
        for (var k = 0; k < 6; k++){
          var ang = (k / 6) * Math.PI * 2 + Math.PI / 6;
          poly.push([cx + radius * Math.cos(ang), cy + radius * Math.sin(ang)]);
        }
        opts.polygon = poly;
      } else {
        opts.polygon = [];
      }
      var d = ME.createDivision(opts);
      ME.recomputeDerived(d);
      newDivs.push(d);
      idx++;
    });

    ME.commitMutation('CSV import ' + newDivs.length, function(){
      if (strategy === 'replace'){
        ME.EDITOR.map.divisions = newDivs;
      } else {
        ME.EDITOR.map.divisions = ME.EDITOR.map.divisions.concat(newDivs);
      }
    });

    var statusEl = document.getElementById('status-tip');
    if (statusEl) statusEl.textContent = 'CSV 导入·' + newDivs.length + ' 省·strategy ' + strategy;
  }

  // ─── Markdown export ────────────────────────────────────

  function exportMarkdown(){
    var map = ME.EDITOR.map;
    var divs = map.divisions;
    var dyn = TM.MapEditor.dynasty.get(map.dynasty);

    var lines = [
      '# ' + (map.title || '未命名地图') + '·' + dyn.label,
      '',
      'date·' + new Date().toISOString().slice(0,10) + '·导出自 tianming map editor·',
      '',
      '## 总览',
      '',
      '- 朝代·**' + dyn.label + '** (' + dyn.yearRange[0] + ' ~ ' + dyn.yearRange[1] + ')',
      '- 时代·' + (map.era || dyn.sampleEra),
      '- 总省·**' + divs.length + '**',
      '- 总人口 (mouths sum)·**' + divs.reduce(function(s, d){ return s + ((d.populationDetail || {}).mouths || 0); }, 0).toLocaleString() + '**',
      '- 总面积·**' + Math.round(divs.reduce(function(s, d){ return s + (d.area || 0); }, 0)).toLocaleString() + '**',
      ''
    ];

    // 自治分布
    var byAutonomy = {};
    divs.forEach(function(d){
      var t = (d.autonomy && d.autonomy.type) || 'zhixia';
      byAutonomy[t] = (byAutonomy[t] || 0) + 1;
    });
    var AUT_LABELS = { zhixia:'直辖', fanguo:'藩国', fanzhen:'藩镇', jimi:'羁縻', chaogong:'朝贡' };
    lines.push('## 自治分布', '');
    Object.keys(byAutonomy).forEach(function(t){
      lines.push('- ' + (AUT_LABELS[t] || t) + '·' + byAutonomy[t] + ' 省');
    });
    lines.push('');

    // 各省详情
    lines.push('## 各省详情', '');
    divs.forEach(function(d){
      var aut = d.autonomy || {};
      var pd = d.populationDetail || {};
      lines.push('### ' + d.name);
      lines.push('');
      lines.push('- **级别**·' + d.level);
      if (d.officialPosition) lines.push('- **主官**·' + d.officialPosition);
      if (d.governor) lines.push('- **当任**·' + d.governor);
      lines.push('- **自治**·' + (AUT_LABELS[aut.type] || aut.type || 'zhixia') +
                 (aut.holder ? ' (' + aut.holder + ')' : ''));
      lines.push('- **地形**·' + (d.terrain || '平原') + (d.specialResources ? '·特产 ' + d.specialResources : ''));
      lines.push('- **繁荣**·' + d.prosperity + '·税档 ' + (d.taxLevel || '中'));
      if (pd.mouths){
        lines.push('- **人口**·' + pd.mouths.toLocaleString() + ' 口·' +
                   (pd.households ? pd.households.toLocaleString() + ' 户' : '') +
                   (pd.ding ? '·' + pd.ding.toLocaleString() + ' 丁' : ''));
      }
      if (d.minxinLocal != null) lines.push('- **民心**·' + d.minxinLocal + ' / **腐败**·' + d.corruptionLocal);
      if (d.establishedYear) lines.push('- **设置**·' + d.establishedYear + (d.abolishedYear ? '·废止 ' + d.abolishedYear : ''));
      var flags = [];
      if (d.isCapital) flags.push('都城');
      if (d.isFrontier) flags.push('边镇');
      if (d.isJunDi) flags.push('军镇');
      if (d.isTradePort) flags.push('商埠');
      if (d.isHistoric) flags.push('历史名城');
      if (flags.length) lines.push('- **标**·' + flags.join('·'));
      if (d.description) lines.push('', '> ' + d.description);
      lines.push('');
    });

    // 字注 (annotations)
    if (map.annotations && map.annotations.length){
      lines.push('## 字注', '');
      map.annotations.forEach(function(a){
        lines.push('- "' + a.text + '" @ [' + Math.round(a.position[0]) + ',' + Math.round(a.position[1]) + ']');
      });
      lines.push('');
    }

    lines.push('---', '', '— Generated by tianming map editor·' + new Date().toISOString());

    var data = lines.join('\n');
    var name = (map.dynasty || 'map') + '-doc-' + new Date().toISOString().slice(0,10) + '.md';
    if (ME.io && ME.io.download) ME.io.download(name, data, 'text/markdown');
  }

  // ─── modal ──────────────────────────────────────────────

  var _modal = null;
  function ensureModal(){
    if (_modal) return _modal;
    _modal = document.createElement('div');
    _modal.style.cssText = 'position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:9999; background:#1a1a1f; border:1px solid #3a3530; border-radius:6px; padding:14px 18px; min-width:480px; max-width:600px; max-height:85vh; overflow:auto; color:#e8ddc8; font-family:inherit; box-shadow:0 8px 30px rgba(0,0,0,0.6); display:none;';
    document.body.appendChild(_modal);
    return _modal;
  }

  function openMenu(){
    var modal = ensureModal();
    var divs = ME.EDITOR.map.divisions;
    modal.innerHTML = '\
      <div style="display:flex; justify-content:space-between; margin-bottom:12px;">\
        <div style="font-size:14px; color:#c9a96e;">批量 I/O</div>\
        <button class="me-btn" id="bulk-close">×</button>\
      </div>\
      <div style="font-size:11px; color:#6a6560; margin-bottom:14px;">当前 ' + divs.length + ' 省·' + (ME.EDITOR.map.annotations ? ME.EDITOR.map.annotations.length + ' 字注' : '0 字注') + '</div>\
      \
      <div style="margin-bottom:12px;">\
        <div style="font-size:12px; color:#c9a96e; margin-bottom:6px;">导入</div>\
        <button class="me-btn me-btn-warn" id="bulk-import-csv">CSV·按行 1 省</button>\
        <span style="color:#6a6560; font-size:10px; margin-left:8px;">从 Excel / Sheets 复制粘存为 CSV</span>\
      </div>\
      \
      <div style="margin-bottom:12px;">\
        <div style="font-size:12px; color:#c9a96e; margin-bottom:6px;">导出</div>\
        <button class="me-btn" id="bulk-export-csv">CSV·扁平字段</button>\
        <button class="me-btn" id="bulk-export-md">Markdown·人读文档</button>\
        <span style="color:#6a6560; font-size:10px; margin-left:8px;">CSV 含 ' + CSV_COLS.length + ' 列</span>\
      </div>\
      \
      <div style="font-size:10px; color:#6a6560; padding-top:10px; border-top:1px solid #3a3530;">\
        CSV 列·' + CSV_COLS.join(' / ') + '<br>\
        polygon / extraPolygons / holes / timeline / sources 不在 CSV 内·导入后用 P/E 工具画·或导出 JSON 整状态\
      </div>\
    ';
    modal.style.display = 'block';

    document.getElementById('bulk-close').onclick = function(){ modal.style.display = 'none'; };
    document.getElementById('bulk-import-csv').onclick = function(){ modal.style.display = 'none'; importCSV(); };
    document.getElementById('bulk-export-csv').onclick = function(){ modal.style.display = 'none'; exportCSV(); };
    document.getElementById('bulk-export-md').onclick = function(){ modal.style.display = 'none'; exportMarkdown(); };
  }

  function esc(s){
    return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }

  // expose
  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.bulk = {
    CSV_COLS: CSV_COLS,
    parseCSV: parseCSV,
    escapeCSV: escapeCSV,
    divToFlat: divToFlat,
    flatToDiv: flatToDiv,
    exportCSV: exportCSV,
    importCSV: importCSV,
    exportMarkdown: exportMarkdown,
    openMenu: openMenu
  };

})(typeof window !== 'undefined' ? window : this);
