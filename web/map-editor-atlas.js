// map-editor-atlas.js
// 跨朝代地图库·atlas
// 多个 dynasty map 共存于 localStorage·按 crossDynastyId 链接同地异名
// 模态·搜地名·跨朝代列表·"此地·汉河西郡 → 唐凉州 → 明甘肃"
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[atlas] core not loaded'); return; }

  var LS_LIB_KEY = 'tm.mapEditor.atlasLibrary.v1';

  // ─── library·localStorage 持久化 ─────────────────────────

  function loadLibrary(){
    try {
      var s = localStorage.getItem(LS_LIB_KEY);
      if (!s) return {};
      return JSON.parse(s);
    } catch(e){
      console.error('[atlas] load library fail:', e);
      return {};
    }
  }

  function saveLibrary(lib){
    try {
      localStorage.setItem(LS_LIB_KEY, JSON.stringify(lib));
      return true;
    } catch(e){
      console.error('[atlas] save library fail:', e);
      return false;
    }
  }

  function listLibrary(){
    var lib = loadLibrary();
    return Object.keys(lib).map(function(dynId){
      var entry = lib[dynId];
      return {
        dynasty: dynId,
        title: entry.title || dynId,
        nDivs: (entry.divisions || []).length,
        savedAt: entry.savedAt || 0
      };
    });
  }

  function saveCurrentToLibrary(){
    var lib = loadLibrary();
    var dynastyId = ME.EDITOR.map.dynasty;
    var copy = JSON.parse(JSON.stringify(ME.EDITOR.map));
    copy.savedAt = Date.now();
    lib[dynastyId] = copy;
    saveLibrary(lib);
    ME.fire('atlas-saved', { dynasty: dynastyId });
  }

  function loadFromLibrary(dynastyId){
    var lib = loadLibrary();
    var entry = lib[dynastyId];
    if (!entry){
      meAlert('库中无 ' + dynastyId + ' 朝代地图·请先保存');
      return false;
    }
    if (ME.EDITOR.dirty){
      if (!confirm('当前有未保存改动·覆盖载入?')) return false;
    }
    ME.loadMap(entry);
    if (TM.MapEditor.workflowChain) TM.MapEditor.workflowChain.autoPolish('atlas');
    return true;
  }

  function removeFromLibrary(dynastyId){
    var lib = loadLibrary();
    delete lib[dynastyId];
    saveLibrary(lib);
    ME.fire('atlas-removed', { dynasty: dynastyId });
  }

  // ─── crossDynastyId·链接同地异朝 ─────────────────────────

  // 为当前 division 自动生成 crossDynastyId
  function genCrossId(){
    return 'pl_' + Date.now().toString(36) + '_' + Math.floor(Math.random() * 9999).toString(36);
  }

  // 在所有库 + 当前 map 中搜·按名 / crossDynastyId
  function searchAcross(query){
    var results = [];
    query = (query || '').trim();
    if (!query) return results;

    // 当前 map
    ME.EDITOR.map.divisions.forEach(function(d){
      if (d.name.indexOf(query) !== -1 || d.id === query || (d.crossDynastyId && d.crossDynastyId === query)){
        results.push({ source: 'current', dynasty: ME.EDITOR.map.dynasty, division: d });
      }
    });

    // 库
    var lib = loadLibrary();
    Object.keys(lib).forEach(function(dynId){
      if (dynId === ME.EDITOR.map.dynasty) return; // skip current·已在 above
      var entry = lib[dynId];
      (entry.divisions || []).forEach(function(d){
        if (d.name.indexOf(query) !== -1 || d.id === query || (d.crossDynastyId && d.crossDynastyId === query)){
          results.push({ source: 'library', dynasty: dynId, division: d });
        }
      });
    });

    return results;
  }

  // 按 crossDynastyId 集结·返回此地的跨朝代历史
  function getPlaceHistory(crossDynastyId){
    if (!crossDynastyId) return [];
    var results = [];

    ME.EDITOR.map.divisions.forEach(function(d){
      if (d.crossDynastyId === crossDynastyId){
        results.push({ source: 'current', dynasty: ME.EDITOR.map.dynasty, division: d });
      }
    });

    var lib = loadLibrary();
    Object.keys(lib).forEach(function(dynId){
      if (dynId === ME.EDITOR.map.dynasty) return;
      (lib[dynId].divisions || []).forEach(function(d){
        if (d.crossDynastyId === crossDynastyId){
          results.push({ source: 'library', dynasty: dynId, division: d });
        }
      });
    });

    // 按朝代年代序
    var dynastyOrder = ['shang_zhou','qin','han','tang','song','yuan','ming','qing','republic'];
    results.sort(function(a, b){
      return dynastyOrder.indexOf(a.dynasty) - dynastyOrder.indexOf(b.dynasty);
    });

    return results;
  }

  // 在库中搜可能匹配·按 name·建议链接
  function suggestLinks(division){
    var sugg = [];
    var lib = loadLibrary();
    Object.keys(lib).forEach(function(dynId){
      if (dynId === ME.EDITOR.map.dynasty) return;
      (lib[dynId].divisions || []).forEach(function(d){
        if (!d.name || !division.name) return;
        // 完全匹配 / 包含 / 字面相似
        if (d.name === division.name){
          sugg.push({ score: 100, dynasty: dynId, division: d });
        } else if (d.name.indexOf(division.name) !== -1 || division.name.indexOf(d.name) !== -1){
          sugg.push({ score: 70, dynasty: dynId, division: d });
        } else if (commonChars(d.name, division.name) >= 2){
          sugg.push({ score: 40, dynasty: dynId, division: d });
        }
      });
    });
    sugg.sort(function(a, b){ return b.score - a.score; });
    return sugg.slice(0, 8);
  }

  function commonChars(a, b){
    var setA = {};
    for (var i = 0; i < a.length; i++) setA[a[i]] = true;
    var c = 0;
    for (var j = 0; j < b.length; j++){
      if (setA[b[j]]) c++;
    }
    return c;
  }

  // 链接·把当前 division 的 crossDynastyId 同步到匹配 division
  function linkAs(currentDivId, targetEntry){
    var current = ME.EDITOR.map.divisions.find(function(D){ return D.id === currentDivId; });
    if (!current) return;
    var target = targetEntry.division;
    var cid = target.crossDynastyId || current.crossDynastyId || genCrossId();

    // 当前 map·设 cid
    if (current.crossDynastyId !== cid){
      ME.updateDivision(current.id, { crossDynastyId: cid }, 'link cross-dynasty');
    }

    // 库·把 target 的 cid 也设 (持久化)
    if (targetEntry.source === 'library' && target.crossDynastyId !== cid){
      var lib = loadLibrary();
      var entry = lib[targetEntry.dynasty];
      if (entry){
        var tgt = (entry.divisions || []).find(function(D){ return D.id === target.id; });
        if (tgt){
          tgt.crossDynastyId = cid;
          saveLibrary(lib);
        }
      }
    }
  }

  // ─── modal 渲染 ──────────────────────────────────────────

  var _modalEl = null;
  function ensureModal(){
    if (_modalEl) return _modalEl;
    _modalEl = document.createElement('div');
    _modalEl.className = 'me-atlas-modal';
    _modalEl.style.cssText = 'position:fixed; left:50%; top:50%; transform:translate(-50%,-50%); z-index:9999; background:#1a1a1f; border:1px solid #3a3530; border-radius:6px; padding:14px 18px; min-width:520px; max-width:760px; max-height:85vh; overflow:auto; font-family:inherit; color:#e8ddc8; box-shadow:0 8px 30px rgba(0,0,0,0.6); display:none;';
    document.body.appendChild(_modalEl);
    return _modalEl;
  }

  function openLibrary(){
    var modal = ensureModal();
    var entries = listLibrary();
    var rows = entries.length === 0
      ? '<div style="padding:20px; color:#6a6560; text-align:center;">(库为空·点 [保存当前] 入库)</div>'
      : entries.map(function(e){
          var dyn = TM.MapEditor.dynasty.get(e.dynasty);
          var when = new Date(e.savedAt).toLocaleString();
          return '\
            <div class="me-atlas-row" style="display:grid; grid-template-columns:60px 1fr 80px auto; gap:10px; padding:8px 10px; border-bottom:1px solid #2a2a30; align-items:center;">\
              <span style="color:#c9a96e; font-size:13px;">' + dyn.label + '</span>\
              <span>' + esc(e.title) + ' <span style="color:#6a6560; font-size:10px;">' + e.nDivs + ' 省</span></span>\
              <span style="color:#6a6560; font-size:10px; font-family:Menlo,monospace;">' + when.split(' ')[0] + '</span>\
              <span>\
                <button class="me-btn" data-atlas-load="' + e.dynasty + '">载</button>\
                <button class="me-btn me-btn-danger" data-atlas-del="' + e.dynasty + '">删</button>\
              </span>\
            </div>';
        }).join('');

    modal.innerHTML = '\
      <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:12px;">\
        <div style="font-size:14px; color:#c9a96e;">跨朝代地图库 atlas</div>\
        <button class="me-btn" id="atlas-close">×</button>\
      </div>\
      <div style="margin-bottom:10px;">\
        <button class="me-btn me-btn-warn" id="atlas-save-current">⤴ 保存当前到库</button>\
        <button class="me-btn" id="atlas-search-toggle">🔍 跨朝搜地名</button>\
        <button class="me-btn" id="atlas-load-sample-toggle">载 9 朝代样本</button>\
      </div>\
      \
      <div id="atlas-search-area" style="display:none; margin-bottom:10px; padding:8px; background:#0f0f12; border-radius:3px;">\
        <input type="text" id="atlas-search-input" placeholder="搜地名 (跨当前 + 库)·部分匹配" style="width:100%; background:#26262d; border:1px solid #3a3530; color:#e8ddc8; padding:5px 8px; border-radius:3px; font-family:inherit;" />\
        <div id="atlas-search-results" style="margin-top:8px; max-height:300px; overflow:auto;"></div>\
      </div>\
      \
      <div id="atlas-sample-area" style="display:none; margin-bottom:10px; padding:8px; background:#0f0f12; border-radius:3px;">\
        <div style="font-size:11px; color:#6a6560; margin-bottom:6px;">点朝代名·载入 sample 数据·含 placeholder polygon (geo-hint 布局·后期可 drag refine)</div>\
        <div style="display:grid; grid-template-columns:repeat(3, 1fr); gap:6px;">\
        ' + TM.MapEditor.dynasty.list().map(function(d){
          return '<button class="me-btn" data-atlas-sample="' + d.id + '">' + d.label + '</button>';
        }).join('') + '\
        </div>\
      </div>\
      \
      <div style="border-top:1px solid #3a3530; padding-top:10px;">\
        <div style="font-size:11px; color:#6a6560; margin-bottom:6px;">已保存 ' + entries.length + ' 朝代</div>\
        ' + rows + '\
      </div>\
    ';
    modal.style.display = 'block';

    document.getElementById('atlas-close').addEventListener('click', function(){ modal.style.display = 'none'; });

    document.getElementById('atlas-save-current').addEventListener('click', function(){
      saveCurrentToLibrary();
      openLibrary(); // refresh
    });

    document.getElementById('atlas-search-toggle').addEventListener('click', function(){
      var a = document.getElementById('atlas-search-area');
      a.style.display = a.style.display === 'none' ? 'block' : 'none';
      if (a.style.display === 'block') document.getElementById('atlas-search-input').focus();
    });

    document.getElementById('atlas-search-input').addEventListener('input', function(e){
      var q = e.target.value;
      var results = searchAcross(q);
      var area = document.getElementById('atlas-search-results');
      if (results.length === 0){
        area.innerHTML = '<div style="color:#6a6560; padding:6px; font-size:11px;">无匹配</div>';
      } else {
        area.innerHTML = results.slice(0, 30).map(function(r){
          var dyn = TM.MapEditor.dynasty.get(r.dynasty);
          var src = r.source === 'current' ? '<span style="color:#c9a96e">当前</span>' : '<span style="color:#6a6560">库</span>';
          return '<div style="padding:5px 6px; border-bottom:1px solid #2a2a30; font-size:11px; display:grid; grid-template-columns:60px 1fr auto; gap:8px; align-items:center;">\
            <span style="color:#5a7a9e;">' + dyn.label + '</span>\
            <span>' + esc(r.division.name) + (r.division.crossDynastyId ? ' <span style="color:#6a9a7f; font-size:9px;">[已链]</span>' : '') + '</span>\
            <span>' + src + '</span>\
          </div>';
        }).join('');
      }
    });

    document.getElementById('atlas-load-sample-toggle').addEventListener('click', function(){
      var a = document.getElementById('atlas-sample-area');
      a.style.display = a.style.display === 'none' ? 'block' : 'none';
    });

    modal.querySelectorAll('[data-atlas-sample]').forEach(function(b){
      b.addEventListener('click', function(){
        var dynId = b.getAttribute('data-atlas-sample');
        if (TM.MapEditor.sampleGen){
          var ok = TM.MapEditor.sampleGen.loadSample(dynId);
          if (ok){ modal.style.display = 'none'; }
        }
      });
    });

    modal.querySelectorAll('[data-atlas-load]').forEach(function(b){
      b.addEventListener('click', function(){
        var dynId = b.getAttribute('data-atlas-load');
        var ok = loadFromLibrary(dynId);
        if (ok){ modal.style.display = 'none'; }
      });
    });

    modal.querySelectorAll('[data-atlas-del]').forEach(function(b){
      b.addEventListener('click', function(){
        var dynId = b.getAttribute('data-atlas-del');
        if (!confirm('删 ' + dynId + ' 朝代地图? 不可恢复·导出后再删')) return;
        removeFromLibrary(dynId);
        openLibrary();
      });
    });
  }

  function openPlaceHistory(division){
    var modal = ensureModal();
    var cid = division.crossDynastyId;

    if (!cid){
      // 无 crossDynastyId·建议 link
      var sugg = suggestLinks(division);
      modal.innerHTML = '\
        <div style="display:flex; justify-content:space-between; margin-bottom:10px;">\
          <div style="font-size:14px; color:#c9a96e;">' + esc(division.name) + ' · 无 crossDynastyId</div>\
          <button class="me-btn" id="atlas-close">×</button>\
        </div>\
        <div style="font-size:11px; color:#6a6560; margin-bottom:10px;">链接此省到其他朝代相同地·查跨朝代历史</div>\
        \
        <div style="margin-bottom:10px;">\
          <button class="me-btn me-btn-warn" id="atlas-gen-cid">生成新 ID·独立此地</button>\
        </div>\
        \
        ' + (sugg.length > 0 ? '\
          <div style="border-top:1px solid #3a3530; padding-top:10px;">\
            <div style="font-size:11px; color:#c9a96e; margin-bottom:6px;">建议链接 (库内同名 / 字面相似)</div>\
            ' + sugg.map(function(s){
              var dyn = TM.MapEditor.dynasty.get(s.dynasty);
              return '<div style="display:grid; grid-template-columns:60px 1fr auto; gap:8px; padding:6px; border-bottom:1px solid #2a2a30; font-size:11px; align-items:center;">\
                <span style="color:#5a7a9e;">' + dyn.label + '</span>\
                <span>' + esc(s.division.name) + ' <span style="color:#6a6560; font-size:9px;">score ' + s.score + '</span></span>\
                <button class="me-btn" data-atlas-link-as="' + s.dynasty + '|' + esc(s.division.id) + '">链接</button>\
              </div>';
            }).join('') + '\
          </div>\
        ' : '<div style="color:#6a6560; font-size:11px;">(库为空·先保存其他朝代再来链接)</div>') + '\
      ';
      modal.style.display = 'block';

      document.getElementById('atlas-close').addEventListener('click', function(){ modal.style.display = 'none'; });
      document.getElementById('atlas-gen-cid').addEventListener('click', function(){
        ME.updateDivision(division.id, { crossDynastyId: genCrossId() }, 'gen cross-dynasty id');
        modal.style.display = 'none';
      });

      modal.querySelectorAll('[data-atlas-link-as]').forEach(function(b){
        b.addEventListener('click', function(){
          var parts = b.getAttribute('data-atlas-link-as').split('|');
          var dynId = parts[0];
          var divId = parts[1];
          var lib = loadLibrary();
          var tgt = (lib[dynId].divisions || []).find(function(D){ return D.id === divId; });
          if (tgt){
            linkAs(division.id, { source: 'library', dynasty: dynId, division: tgt });
            modal.style.display = 'none';
          }
        });
      });
      return;
    }

    // 有 crossDynastyId·显跨朝代历史
    var history = getPlaceHistory(cid);
    var rows = history.length === 0
      ? '<div style="padding:14px; color:#6a6560; text-align:center;">(无匹配·此 crossDynastyId 仅当前一处)</div>'
      : history.map(function(r){
          var dyn = TM.MapEditor.dynasty.get(r.dynasty);
          var typ = r.division.autonomy && r.division.autonomy.type ? r.division.autonomy.type : 'zhixia';
          var typLbl = ({zhixia:'直辖',fanguo:'藩国',fanzhen:'藩镇',jimi:'羁縻',chaogong:'朝贡'})[typ] || typ;
          var indicator = r.source === 'current' ? ' ← 当前' : '';
          return '\
            <div style="display:grid; grid-template-columns:80px 1fr 60px 100px; gap:10px; padding:8px 10px; border-bottom:1px solid #2a2a30; align-items:center; font-size:12px;">\
              <span style="color:#5a7a9e; font-size:13px;">' + dyn.label + '</span>\
              <span>' + esc(r.division.name) + indicator + '</span>\
              <span style="color:#6a6560; font-size:10px;">' + r.division.level + '</span>\
              <span style="color:#c9a96e; font-size:10px;">' + typLbl + '</span>\
            </div>';
        }).join('');

    modal.innerHTML = '\
      <div style="display:flex; justify-content:space-between; margin-bottom:10px;">\
        <div style="font-size:14px; color:#c9a96e;">' + esc(division.name) + ' · 跨朝代历史</div>\
        <button class="me-btn" id="atlas-close">×</button>\
      </div>\
      <div style="font-size:11px; color:#6a6560; margin-bottom:10px;">crossDynastyId·<code style="background:#0f0f12; padding:2px 5px; border-radius:2px;">' + cid + '</code> · ' + history.length + ' 朝代记录</div>\
      <div>' + rows + '</div>\
      <div style="margin-top:10px; padding-top:10px; border-top:1px solid #3a3530;">\
        <button class="me-btn me-btn-danger" id="atlas-unlink">解除链接</button>\
      </div>\
    ';
    modal.style.display = 'block';

    document.getElementById('atlas-close').addEventListener('click', function(){ modal.style.display = 'none'; });
    document.getElementById('atlas-unlink').addEventListener('click', function(){
      if (!confirm('解除此省的 crossDynastyId? (其他朝代相同 ID 的不会动)')) return;
      ME.updateDivision(division.id, { crossDynastyId: '' }, 'unlink cross-dynasty');
      modal.style.display = 'none';
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
  global.TM.MapEditor.atlas = {
    LS_LIB_KEY: LS_LIB_KEY,
    loadLibrary: loadLibrary,
    saveLibrary: saveLibrary,
    listLibrary: listLibrary,
    saveCurrentToLibrary: saveCurrentToLibrary,
    loadFromLibrary: loadFromLibrary,
    removeFromLibrary: removeFromLibrary,
    genCrossId: genCrossId,
    searchAcross: searchAcross,
    getPlaceHistory: getPlaceHistory,
    suggestLinks: suggestLinks,
    linkAs: linkAs,
    openLibrary: openLibrary,
    openPlaceHistory: openPlaceHistory
  };

})(typeof window !== 'undefined' ? window : this);
