// ── 章节导航（grep 小节标题跳转，行号会漂）──
//   剧本编辑器 — 角色/势力/党派/阶层/物品 CRUD（依赖 editor-core.js）
//   §1 基础       updateScriptField + 各实体 CRUD
//   §2 特质       特质选择弹窗
//   §3 角色深化   家族成员/仕途条目行（动态增删）· AI 智能立绘生成
//   §4 势力深化   六维凝聚力 / 军事结构 / 经济结构 / 继承
//   §5 阶层深化   代表 NPC / 领袖 / 地域变体 / 内部分化 / 分级不满 / 经济指标
//   §6 关系       势力关系矩阵 · C1 得罪阈值可视化编辑（党派/阶层通用）
// ─────────────────────────────────────────────
// ============================================================
// 剧本编辑器 — 角色/势力/党派/阶层/物品 CRUD (editor-crud.js)
// 依赖: editor-core.js (scriptData, escHtml, autoSave, etc.)
// ============================================================

  function updateScriptField(field, value) {
    scriptData[field] = value;
    autoSave();
  }

  function _cloneJson(v) {
    return v === undefined ? undefined : JSON.parse(JSON.stringify(v));
  }

  function _jsonText(v, fallback) {
    if (v === undefined || v === null) return fallback || '';
    try { return JSON.stringify(v, null, 2); }
    catch(_) { return fallback || ''; }
  }

  // B1-B3: 角色列表状态
  var _charFilter = 'all'; // all/historical/fictional
  var _charSort = 'default'; // default/loyalty/intelligence/faction
  var _charSearch = '';
  var _charBatchMode = false;
  var _charSelected = {};

  function renderCharacters() {
    var list = document.getElementById('characterList');
    if (!list) return;

    // B1: 渲染工具栏（搜索+过滤+排序+批量）
    var toolbar = document.getElementById('charToolbar');
    if (!toolbar) {
      toolbar = document.createElement('div');
      toolbar.id = 'charToolbar';
      toolbar.style.cssText = 'display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin-bottom:10px;';
      list.parentElement.insertBefore(toolbar, list);
    }
    toolbar.innerHTML =
      '<input type="text" id="charSearchInput" placeholder="搜索名字/势力..." value="' + escHtml(_charSearch) + '" oninput="_charSearch=this.value;renderCharacters()" style="flex:1;min-width:100px;font-size:12px;padding:4px 8px;">' +
      '<select onchange="_charFilter=this.value;renderCharacters()" style="font-size:12px;padding:3px 6px;">' +
        '<option value="all"' + (_charFilter==='all'?' selected':'') + '>全部</option>' +
        '<option value="historical"' + (_charFilter==='historical'?' selected':'') + '>史实</option>' +
        '<option value="fictional"' + (_charFilter==='fictional'?' selected':'') + '>虚构</option>' +
      '</select>' +
      '<select onchange="_charSort=this.value;renderCharacters()" style="font-size:12px;padding:3px 6px;">' +
        '<option value="default"' + (_charSort==='default'?' selected':'') + '>默认</option>' +
        '<option value="loyalty"' + (_charSort==='loyalty'?' selected':'') + '>按忠诚</option>' +
        '<option value="intelligence"' + (_charSort==='intelligence'?' selected':'') + '>\u6309\u667A\u8C0B</option>' +
        '<option value="diplomacy"' + (_charSort==='diplomacy'?' selected':'') + '>\u6309\u5916\u4EA4</option>' +
        '<option value="faction"' + (_charSort==='faction'?' selected':'') + '>\u6309\u52BF\u529B</option>' +
      '</select>' +
      '<button onclick="_charBatchMode=!_charBatchMode;_charSelected={};renderCharacters()" style="font-size:11px;padding:3px 8px;background:' + (_charBatchMode?'var(--gold-d)':'none') + ';border:1px solid var(--bdr);color:' + (_charBatchMode?'#fff':'var(--txt-d)') + ';border-radius:4px;cursor:pointer;">' + (_charBatchMode?'退出批量':'批量') + '</button>' +
      (_charBatchMode ? '<button onclick="batchDeleteChars()" style="font-size:11px;padding:3px 8px;background:#5a2020;color:#eee;border:none;border-radius:4px;cursor:pointer;">\u5220\u9664\u9009\u4E2D</button>' +
        '<button onclick="batchEditChars()" style="font-size:11px;padding:3px 8px;background:var(--gold-d);color:#fff;border:none;border-radius:4px;cursor:pointer;">\u6279\u91CF\u6539\u5C5E\u6027</button>' : '') +
      '<button onclick="importCharsFromCSV()" style="font-size:11px;padding:3px 8px;background:none;border:1px solid var(--bdr);color:var(--txt-d);border-radius:4px;cursor:pointer;">CSV\u5BFC\u5165</button>' +
      '<span style="font-size:11px;color:var(--txt-d);">共' + scriptData.characters.length + '人</span>';

    // 过滤+搜索+排序
    var chars = scriptData.characters.map(function(c, i) { return { c: c, idx: i }; });
    if (_charFilter !== 'all') chars = chars.filter(function(x) { return x.c.type === _charFilter; });
    if (_charSearch) {
      var kw = _charSearch.toLowerCase();
      chars = chars.filter(function(x) {
        return (x.c.name||'').toLowerCase().indexOf(kw) >= 0 || (x.c.faction||'').toLowerCase().indexOf(kw) >= 0 || (x.c.title||'').toLowerCase().indexOf(kw) >= 0;
      });
    }
    if (_charSort === 'loyalty') chars.sort(function(a,b) { return (b.c.loyalty||0) - (a.c.loyalty||0); });
    else if (_charSort === 'intelligence') chars.sort(function(a,b) { return (b.c.intelligence||0) - (a.c.intelligence||0); });
    else if (_charSort === 'diplomacy') chars.sort(function(a,b) { return (b.c.diplomacy||0) - (a.c.diplomacy||0); });
    else if (_charSort === 'faction') chars.sort(function(a,b) { return (a.c.faction||'').localeCompare(b.c.faction||''); });

    // 势力颜色映射
    var facColors = {};
    (scriptData.factions || []).forEach(function(f) { if (f.name && f.color) facColors[f.name] = f.color; });

    // B2: 渲染卡片
    var pi = scriptData.playerInfo || {};
    list.innerHTML = '';
    chars.forEach(function(x) {
      var c = x.c; var i = x.idx;
      var isPlayer = (pi.characterName && c.name === pi.characterName);
      var tc = c.type === 'historical' ? 'tag-historical' : 'tag-fictional';
      var tt = c.type === 'historical' ? '史实' : '虚构';
      var facColor = facColors[c.faction] || '';
      var facTag = c.faction ? '<span class="card-tag tag-core"' + (facColor ? ' style="border-left:3px solid ' + facColor + ';"' : '') + '>' + escHtml(c.faction) + '</span>' : '';
      var titleStr = c.officialTitle && c.officialTitle !== '无' ? ' · ' + c.officialTitle : (c.title ? ' · ' + c.title : '');
      var portraitHtml = c.portrait ? '<img src="' + escHtml(c.portrait) + '" style="width:48px;height:48px;object-fit:cover;border-radius:4px;float:right;margin:0 0 4px 8px;">' : '';
      var meta = [];
      if (c.gender) meta.push(c.gender);
      if (c.age) meta.push(c.age + '岁');
      if (c.ethnicity) meta.push(c.ethnicity);
      if (c.stance) meta.push('立场:' + c.stance);
      var metaStr = meta.length ? ' | ' + meta.join(' ') : '';

      var h = '<div class="card" onclick="editCharacter(' + i + ')" style="position:relative;overflow:hidden;' + (isPlayer ? 'border:1px solid var(--gold);' : '') + '">';
      if (_charBatchMode) h += '<input type="checkbox" ' + (_charSelected[i] ? 'checked' : '') + ' onclick="event.stopPropagation();_charSelected[' + i + ']=this.checked;" style="position:absolute;top:10px;left:10px;z-index:2;">';
      h += portraitHtml;
      if (isPlayer) h += '<span style="position:absolute;top:4px;left:' + (_charBatchMode?'28':'8') + 'px;font-size:9px;background:var(--gold);color:#111;padding:0 4px;border-radius:3px;">玩家</span>';
      h += '<div class="card-title">' + escHtml(c.name) + escHtml(titleStr) + '</div>';
      h += '<div class="card-meta"><span class="card-tag ' + tc + '">' + tt + '</span> ' + facTag + ' ' + escHtml(c.role || '') + escHtml(metaStr) + '</div>';
      if (c.appearance) h += '<div style="font-size:10px;color:var(--txt-d);margin:2px 0;font-style:italic;">' + escHtml(c.appearance).substring(0, 40) + '</div>';
      h += '<div class="card-desc">' + escHtml((c.bio || '暂无简介').substring(0, 80)) + '</div>';
      h += '<div style="margin-top:6px;font-size:11px;color:var(--text-dim);">'
        + '忠' + (c.loyalty||0) + ' 野' + (c.ambition||0) + ' 仁' + (c.benevolence||0)
        + ' 智' + (c.intelligence||0) + ' 武' + (c.valor||0) + ' 军' + (c.military||0) + ' 治' + (c.administration||0) + ' 管' + (c.management||0) + ' 魅' + (c.charisma||0) + ' 交' + (c.diplomacy||0)
        + '</div>';
      // 特质标签
      if (Array.isArray(c.traits) && c.traits.length > 0 && window.TRAIT_LIBRARY) {
        var traitTags = c.traits.slice(0, 5).map(function(tid) {
          var t = window.TRAIT_LIBRARY[tid]; if (!t) return '';
          var cat = (window.TRAIT_CATEGORIES||{})[t.category];
          var col = cat ? cat.color : '#888';
          return '<span style="display:inline-block;padding:1px 6px;margin:1px;background:' + col + '22;color:' + col + ';border:1px solid ' + col + '55;border-radius:8px;font-size:10px;">' + (t.name||tid) + '</span>';
        }).filter(Boolean).join('');
        if (traitTags) h += '<div style="margin-top:3px;">' + traitTags + (c.traits.length > 5 ? '<span style="font-size:10px;color:var(--text-dim);">+' + (c.traits.length-5) + '</span>' : '') + '</div>';
      }
      if (!_charBatchMode) h += '<div style="position:absolute;top:8px;right:8px;"><button class="btn" style="padding:2px 8px;font-size:11px;" onclick="event.stopPropagation();deleteCharacter(' + i + ')">删除</button></div>';
      h += '</div>';
      list.innerHTML += h;
    });
    updateBadge('characters', scriptData.characters.length);
  }

  // B3: 批量删除
  function batchDeleteChars() {
    var indices = Object.keys(_charSelected).filter(function(k) { return _charSelected[k]; }).map(Number).sort(function(a,b){return b-a;});
    if (!indices.length) { showToast('未选中任何角色'); return; }
    if (!confirm('确定删除 ' + indices.length + ' 个角色？')) return;
    indices.forEach(function(i) { scriptData.characters.splice(i, 1); });
    _charSelected = {};
    renderCharacters();
    autoSave();
    showToast('已删除 ' + indices.length + ' 个角色');
  }

  // 3.5: 批量修改属性
  function batchEditChars() {
    var indices = Object.keys(_charSelected).filter(function(k){return _charSelected[k];}).map(Number);
    if (!indices.length) { showToast('\u672A\u9009\u4E2D\u4EFB\u4F55\u89D2\u8272'); return; }
    var facOptions = (scriptData.factions||[]).map(function(f){return '<option value="'+escHtml(f.name)+'">'+escHtml(f.name)+'</option>';}).join('');
    var body = '<div style="font-size:0.85rem;">\u5DF2\u9009\u4E2D ' + indices.length + ' \u4E2A\u89D2\u8272\u3002\u7559\u7A7A\u7684\u5B57\u6BB5\u4E0D\u4F1A\u4FEE\u6539\u3002</div>' +
      '<div class="form-group"><label>\u52BF\u529B</label><select id="be-faction"><option value="">\u4E0D\u4FEE\u6539</option>'+facOptions+'</select></div>' +
      '<div class="form-group"><label>\u5FE0\u8BDA</label><input id="be-loyalty" type="number" placeholder="\u4E0D\u4FEE\u6539" min="0" max="100"></div>' +
      '<div class="form-group"><label>\u4F4D\u7F6E</label><input id="be-location" placeholder="\u4E0D\u4FEE\u6539"></div>';
    if (typeof openGenericModal === 'function') {
      openGenericModal('\u6279\u91CF\u4FEE\u6539\u5C5E\u6027', body, function() {
        if (typeof EditHistory !== 'undefined') EditHistory.push('\u6279\u91CF\u4FEE\u6539 ' + indices.length + ' \u89D2\u8272');
        var fac = document.getElementById('be-faction').value;
        var loy = document.getElementById('be-loyalty').value;
        var loc = document.getElementById('be-location').value;
        indices.forEach(function(i) {
          var c = scriptData.characters[i]; if (!c) return;
          if (fac) c.faction = fac;
          if (loy !== '') c.loyalty = parseInt(loy);
          if (loc) c.location = loc;
        });
        renderCharacters();
        if (typeof autoSave === 'function') autoSave();
        showToast('\u5DF2\u6279\u91CF\u4FEE\u6539 ' + indices.length + ' \u4E2A\u89D2\u8272');
      });
    }
  }

  // 3.5: CSV导入角色
  function importCharsFromCSV() {
    var body = '<div style="font-size:0.85rem;margin-bottom:0.5rem;">\u4ECECSV/Excel\u7C98\u8D34\u89D2\u8272\u6570\u636E\u3002\u7B2C\u4E00\u884C\u4E3A\u8868\u5934\uFF08name,faction,title,loyalty,age,...\uFF09\uFF0C\u540E\u7EED\u884C\u4E3A\u6570\u636E\u3002</div>' +
      '<textarea id="csv-input" rows="10" style="width:100%;font-family:monospace;font-size:0.78rem;" placeholder="name,faction,title,loyalty,age\n\u674E\u767D,\u5510\u671D,\u8BD7\u4ED9,85,42"></textarea>';
    if (typeof openGenericModal === 'function') {
      openGenericModal('CSV\u5BFC\u5165\u89D2\u8272', body, function() {
        var raw = document.getElementById('csv-input').value.trim();
        if (!raw) return;
        if (typeof EditHistory !== 'undefined') EditHistory.push('CSV\u5BFC\u5165\u89D2\u8272');
        var lines = raw.split('\n').map(function(l){return l.trim();}).filter(function(l){return l;});
        if (lines.length < 2) { showToast('\u81F3\u5C11\u9700\u8981\u8868\u5934+1\u884C\u6570\u636E'); return; }
        // 解析表头
        var sep = lines[0].indexOf('\t') >= 0 ? '\t' : lines[0].indexOf(',') >= 0 ? ',' : lines[0].indexOf('\uFF0C') >= 0 ? '\uFF0C' : ',';
        var headers = lines[0].split(sep).map(function(h){return h.trim().toLowerCase();});
        var added = 0;
        for (var i = 1; i < lines.length; i++) {
          var cols = lines[i].split(sep);
          var ch = {};
          headers.forEach(function(h, ci) {
            var val = (cols[ci]||'').trim();
            if (!val) return;
            // 数字字段自动转换
            if (['loyalty','ambition','intelligence','valor','military','administration','charisma','diplomacy','age','stress','health'].indexOf(h) >= 0) {
              ch[h] = parseFloat(val) || 0;
            } else {
              ch[h] = val;
            }
          });
          if (ch.name) {
            if (!ch.type) ch.type = 'custom';
            scriptData.characters.push(ch);
            added++;
          }
        }
        renderCharacters();
        if (typeof autoSave === 'function') autoSave();
        showToast('\u5DF2\u5BFC\u5165 ' + added + ' \u4E2A\u89D2\u8272');
      });
    }
  }

  // ───────── 特质选择弹窗 ─────────
  window._selectedTraitsForChar = [];
  function _updateTraitsDisplay() {
    var el = document.getElementById('charTraitsDisplay');
    if (!el) return;
    var traits = window._selectedTraitsForChar || [];
    if (!traits.length) { el.innerHTML = '<span style="color:var(--text-dim);">暂无特质</span>'; return; }
    el.innerHTML = traits.map(function(tid) {
      var t = (window.TRAIT_LIBRARY || {})[tid];
      var catInfo = t && window.TRAIT_CATEGORIES && window.TRAIT_CATEGORIES[t.category];
      var col = catInfo ? catInfo.color : '#888';
      return '<span style="display:inline-block;padding:2px 8px;margin:1px 2px;background:' + col + '22;border:1px solid ' + col + ';border-radius:10px;font-size:11px;color:' + col + ';">' + (t ? t.name : tid) + '</span>';
    }).join('');
  }

  window.openTraitSelectorModal = function() {
    if (!window.TRAIT_LIBRARY) { alert('特质库未加载'); return; }
    var cur = (window._selectedTraitsForChar || []).slice();
    var cats = window.TRAIT_CATEGORIES || {};
    var lib = window.TRAIT_LIBRARY;
    var html = '<div id="_traitSelModal" style="position:fixed;inset:0;z-index:9998;background:rgba(0,0,0,0.85);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);" onclick="if(event.target===this)_closeTraitSel()">';
    html += '<div style="max-width:920px;width:92%;max-height:86vh;background:var(--bg-1);border:1px solid var(--gold);border-radius:10px;padding:16px;overflow-y:auto;" onclick="event.stopPropagation()">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">';
    html += '<h3 style="color:var(--gold);margin:0;">🎭 选择特质</h3>';
    html += '<div style="display:flex;gap:8px;align-items:center;">';
    html += '<input id="_traitSearch" placeholder="搜索特质/效果..." style="padding:4px 8px;width:200px;" oninput="_filterTraits(this.value)">';
    html += '<span id="_traitCount" style="color:var(--text-dim);font-size:12px;">已选:' + cur.length + '</span>';
    html += '</div></div>';
    html += '<div style="font-size:11px;color:var(--text-dim);margin-bottom:8px;">点击特质加入；再次点击移除；互斥特质自动排除。</div>';
    // 按类别分组
    Object.keys(cats).forEach(function(ck) {
      var catTraits = Object.keys(lib).filter(function(tid) { return lib[tid].category === ck; });
      if (!catTraits.length) return;
      var catInfo = cats[ck];
      html += '<div class="_trait-cat-block" data-cat="' + ck + '" style="margin-bottom:12px;">';
      html += '<div style="font-size:13px;color:' + catInfo.color + ';font-weight:700;padding:4px 0;border-bottom:1px solid ' + catInfo.color + '44;margin-bottom:6px;">◆ ' + catInfo.label + ' <span style="font-size:10px;color:var(--text-dim);font-weight:normal;">· ' + catInfo.desc + '</span></div>';
      html += '<div style="display:flex;flex-wrap:wrap;gap:4px;">';
      catTraits.forEach(function(tid) {
        var t = lib[tid];
        var on = cur.indexOf(tid) >= 0;
        var bg = on ? catInfo.color + '33' : 'var(--bg-2)';
        var border = on ? catInfo.color : 'var(--border)';
        html += '<div class="_trait-item" data-tid="' + tid + '" data-name="' + (t.name||'') + '" data-beh="' + (t.behaviorTendency||'').replace(/"/g,'&quot;') + '" onclick="_toggleTraitSel(\'' + tid + '\')" style="padding:4px 10px;background:' + bg + ';border:1px solid ' + border + ';border-radius:14px;cursor:pointer;font-size:12px;color:' + catInfo.color + ';transition:all 0.15s;" title="' + (t.behaviorTendency||t.description||'').replace(/"/g,'&quot;') + '">' + (t.name || tid) + '</div>';
      });
      html += '</div></div>';
    });
    html += '<div style="display:flex;gap:8px;justify-content:flex-end;margin-top:10px;">';
    html += '<button class="btn" onclick="_clearTraitSel()">全部清空</button>';
    html += '<button class="btn" onclick="_closeTraitSel()">取消</button>';
    html += '<button class="btn btn-gold" onclick="_confirmTraitSel()">确认</button>';
    html += '</div>';
    html += '</div></div>';
    document.body.insertAdjacentHTML('beforeend', html);
    // 临时副本
    window._traitSelWorking = cur.slice();
  };
  window._closeTraitSel = function() {
    var m = document.getElementById('_traitSelModal'); if (m) m.remove();
  };
  window._clearTraitSel = function() {
    window._traitSelWorking = [];
    _refreshTraitSelUI();
  };
  window._toggleTraitSel = function(tid) {
    var w = window._traitSelWorking || (window._traitSelWorking = []);
    var lib = window.TRAIT_LIBRARY || {};
    var idx = w.indexOf(tid);
    if (idx >= 0) { w.splice(idx, 1); }
    else {
      // 检查冲突
      var conflict = w.find(function(x) { return window.traitsConflict && window.traitsConflict(x, tid); });
      if (conflict) {
        // 自动移除冲突特质
        w = w.filter(function(x) { return !window.traitsConflict(x, tid); });
        w.push(tid);
        window._traitSelWorking = w;
      } else {
        w.push(tid);
      }
    }
    _refreshTraitSelUI();
  };
  function _refreshTraitSelUI() {
    var w = window._traitSelWorking || [];
    var cats = window.TRAIT_CATEGORIES || {};
    document.querySelectorAll('._trait-item').forEach(function(item) {
      var tid = item.getAttribute('data-tid');
      var on = w.indexOf(tid) >= 0;
      var t = (window.TRAIT_LIBRARY||{})[tid];
      var catInfo = t && cats[t.category];
      var col = catInfo ? catInfo.color : '#888';
      item.style.background = on ? col + '33' : 'var(--bg-2)';
      item.style.borderColor = on ? col : 'var(--border)';
    });
    var cntEl = document.getElementById('_traitCount');
    if (cntEl) cntEl.textContent = '已选:' + w.length;
  }
  window._filterTraits = function(kw) {
    kw = (kw || '').toLowerCase();
    document.querySelectorAll('._trait-item').forEach(function(item) {
      var nm = (item.getAttribute('data-name') || '').toLowerCase();
      var beh = (item.getAttribute('data-beh') || '').toLowerCase();
      item.style.display = (!kw || nm.indexOf(kw) >= 0 || beh.indexOf(kw) >= 0) ? '' : 'none';
    });
  };
  window._confirmTraitSel = function() {
    window._selectedTraitsForChar = (window._traitSelWorking || []).slice();
    _updateTraitsDisplay();
    _closeTraitSel();
  };

  function openCharModal(index) {
    editingCharIndex = (index !== undefined) ? index : -1;
    var isEdit = editingCharIndex >= 0;
    document.getElementById('charModalTitle').textContent
      = isEdit ? '编辑人物' : '添加人物';
    var c = isEdit
      ? scriptData.characters[editingCharIndex]
      : {
          name:'', type:'historical', title:'',
          faction:'', role:'', bio:'',
          loyalty:50, ambition:50, benevolence:50,
          intelligence:50, valor:50, military:50, administration:50, management:50, charisma:50, diplomacy:50,
          appearance:'',
          age:'', gender:'男', ethnicity:'',
          birthplace:'', birthTime:'', occupation:'', location:'',
          party:'无党派', officialTitle:'无',
          stance:'', personality:'', persona:'',
          learning:'', playerRelation:'', faith:'', culture:'', portrait:'',
          vassalType:'', traits:[]
        };
    document.getElementById('charName').value = c.name;
    document.getElementById('charType').value = c.type;
    document.getElementById('charTitle').value = c.title || '';
    document.getElementById('charFaction').value = c.faction || '';
    document.getElementById('charRole').value = c.role || '';
    document.getElementById('charBio').value = c.bio || '';
    document.getElementById('charAge').value = c.age || '';
    document.getElementById('charGender').value = c.gender || '男';
    document.getElementById('charEthnicity').value = c.ethnicity || '';
    document.getElementById('charBirthplace').value = c.birthplace || '';
    var birthTimeEl = document.getElementById('charBirthTime');
    if (birthTimeEl) birthTimeEl.value = c.birthTime || (c.birthYear !== undefined && c.birthYear !== null ? String(c.birthYear) : '');
    document.getElementById('charOccupation').value = c.occupation || '';
    if (document.getElementById('charLocation')) document.getElementById('charLocation').value = c.location || '';
    document.getElementById('charOfficialTitle').value = c.officialTitle || '无';
    document.getElementById('charStance').value = c.stance || '';
    document.getElementById('charPersonality').value = c.personality || '';
    document.getElementById('charPersona').value = c.persona || '';
    document.getElementById('charLearning').value = c.learning || '';
    document.getElementById('charPlayerRelation').value = c.playerRelation || '';
    document.getElementById('charFaith').value = c.faith || '';
    document.getElementById('charCulture').value = c.culture || '';
    // A2: appearance
    var appEl = document.getElementById('charAppearance');
    if (appEl) appEl.value = c.appearance || '';
    // E2: faction dropdown — populate with existing factions
    var facEl = document.getElementById('charFaction');
    if (facEl && facEl.tagName === 'SELECT') {
      facEl.innerHTML = '<option value="">无势力</option>';
      (scriptData.factions || []).forEach(function(f) {
        var o = document.createElement('option'); o.value = f.name; o.textContent = f.name;
        facEl.appendChild(o);
      });
      // 加入当前值（可能是不在列表中的旧值）
      if (c.faction && !Array.from(facEl.options).some(function(o){return o.value===c.faction;})) {
        var eo = document.createElement('option'); eo.value = c.faction; eo.textContent = c.faction + ' (手动)';
        facEl.appendChild(eo);
      }
      facEl.value = c.faction || '';
    } else if (facEl) {
      facEl.value = c.faction || '';
    }
    // Party dropdown
    var partyEl = document.getElementById('charParty');
    partyEl.innerHTML = '<option value="">无党派</option>';
    (scriptData.parties || []).forEach(function(p) {
      var opt = document.createElement('option');
      opt.value = p.name || p;
      opt.textContent = p.name || p;
      partyEl.appendChild(opt);
    });
    partyEl.value = c.party || '';
    // 社会阶层下拉
    var classEl = document.getElementById('charClass');
    if (classEl) {
      classEl.innerHTML = '<option value="">未定</option>';
      (scriptData.classes || []).forEach(function(cls) {
        var opt = document.createElement('option');
        opt.value = cls.name || cls;
        opt.textContent = cls.name || cls;
        classEl.appendChild(opt);
      });
      classEl.value = c.class || '';
    }
    document.getElementById('charPartyRank').value = c.partyRank || '';
    document.getElementById('charPartyInfluence').value = c.partyInfluence !== undefined ? c.partyInfluence : '';
    var hasParty = !!(c.party);
    document.getElementById('charPartyRankGroup').style.display = hasParty ? 'block' : 'none';
    document.getElementById('charPartyInfluenceGroup').style.display = hasParty ? 'block' : 'none';
    // Vassal type dropdown
    var vassalEl = document.getElementById('charVassalType');
    vassalEl.innerHTML = '<option value="">非封臣</option>';
    if (scriptData.vassalSystem && scriptData.vassalSystem.vassalTypes) {
      scriptData.vassalSystem.vassalTypes.forEach(function(vt) {
        var opt = document.createElement('option');
        opt.value = vt.name;
        opt.textContent = vt.name;
        vassalEl.appendChild(opt);
      });
    }
    vassalEl.value = c.vassalType || '';
    // Portrait
    var prevImg = document.getElementById('charPortraitPreview');
    var emptyDiv = document.getElementById('charPortraitEmpty');
    var dataInp = document.getElementById('charPortraitData');
    dataInp.value = c.portrait || '';
    if (c.portrait) {
      prevImg.src = c.portrait;
      prevImg.style.display = 'block';
      emptyDiv.style.display = 'none';
    } else {
      prevImg.style.display = 'none';
      emptyDiv.style.display = 'flex';
    }
    var attrs = [
      'loyalty', 'ambition', 'benevolence',
      'intelligence', 'valor', 'military', 'administration', 'management', 'charisma', 'diplomacy'
    ];
    for (var a = 0; a < attrs.length; a++) {
      var k = attrs[a];
      var capK = k.charAt(0).toUpperCase() + k.slice(1);
      var slider = document.getElementById('char' + capK);
      slider.value = c[k] !== undefined ? c[k] : 50;
      slider.nextElementSibling.textContent = slider.value;
    }
    // 五常覆盖值加载
    var _wcOv = c.wuchangOverride || {};
    var _wcIds = ['ren','yi','li','zhi','xin'];
    var _wcKeys = ['仁','义','礼','智','信'];
    for (var _wi=0; _wi<_wcIds.length; _wi++) {
      var _wcEl = document.getElementById('charWuchang_'+_wcIds[_wi]);
      if (_wcEl) _wcEl.value = (_wcOv[_wcKeys[_wi]] !== null && _wcOv[_wcKeys[_wi]] !== undefined) ? _wcOv[_wcKeys[_wi]] : '';
    }
    // 五常自动派生显示
    var _wcDisplay = document.getElementById('wuchangDisplay');
    if (_wcDisplay && typeof calculateWuchang === 'function') {
      var _wc = calculateWuchang(c);
      _wcDisplay.textContent = '自动派生: 仁'+_wc.仁+' 义'+_wc.义+' 礼'+_wc.礼+' 智'+_wc.智+' 信'+_wc.信+' 气质:'+_wc.气质;
    }
    // 特质加载
    var _charTraits = Array.isArray(c.traits) ? c.traits.slice()
                      : Array.isArray(c.traitIds) ? c.traitIds.slice() : [];
    window._selectedTraitsForChar = _charTraits;
    _updateTraitsDisplay();
    // 家世加载
    var _fs = c.familyStatus || {};
    var _fsEl = document.getElementById('charFamilyStatus');
    if (_fsEl) _fsEl.value = _fs.门第 || '';
    var _cnEl = document.getElementById('charClanName');
    if (_cnEl) _cnEl.value = _fs.郡望 || '';
    var _fpEl = document.getElementById('charFamilyPrestige');
    if (_fpEl) _fpEl.value = _fs.声望 || 50;
    var _faEl = document.getElementById('charFather');
    if (_faEl) _faEl.value = c.father || '';
    var _moEl = document.getElementById('charMother');
    if (_moEl) _moEl.value = c.mother || '';
    var _spText = document.getElementById('charSpouse');
    if (_spText) _spText.value = typeof c.spouse === 'string' ? c.spouse : '';
    // 后宫位分
    var _isSpCb = document.getElementById('charIsSpouse');
    var _spRkSel = document.getElementById('charSpouseRank');
    var _spRkWrap = document.getElementById('charSpouseRankWrap');
    if (_isSpCb && _spRkSel) {
      var isSpouse = !!(c.spouse === true || c.spouseRank);
      _isSpCb.checked = isSpouse;
      if (_spRkWrap) _spRkWrap.style.display = isSpouse ? 'inline-flex' : 'none';
      // 填充位分下拉
      var _ranks = (scriptData.haremConfig && scriptData.haremConfig.rankSystem) || [
        {id:'empress',name:'\u7687\u540E'},{id:'consort_noble',name:'\u8D35\u5983'},{id:'consort',name:'\u5983'},
        {id:'concubine',name:'\u59EC'},{id:'attendant',name:'\u8D35\u4EBA'},{id:'maid',name:'\u5E38\u5728'}
      ];
      _spRkSel.innerHTML = _ranks.map(function(r) {
        return '<option value="' + r.id + '"' + (c.spouseRank === r.id ? ' selected' : '') + '>' + (r.name || r.id) + '</option>';
      }).join('');
    }
    var deepStateEl = document.getElementById('charDeepStateJson');
    if (deepStateEl) {
      deepStateEl.value = _jsonText({
        partyRef: c.partyRef,
        factionRef: c.factionRef,
        officeRef: c.officeRef,
        relations: c.relations,
        lastInteractionMemory: c.lastInteractionMemory,
        recognitionState: c.recognitionState
      }, '{}');
    }

    document.getElementById('charModal').classList.add('show');

    // 人物志扩展字段（字/号/师承/朋友/爱好/内心独白/职事/家族成员/仕途）——动态注入
    try {
      var _renwuExt = document.getElementById('renwu-ext-wrapper');
      if (_renwuExt) _renwuExt.remove();
      var _bioField = document.getElementById('charBio');
      if (_bioField) {
        var _ext = document.createElement('div');
        _ext.id = 'renwu-ext-wrapper';
        var _friends = Array.isArray(c.friends) ? c.friends.join('、') : (c.friends || '');
        var _hobbies = Array.isArray(c.hobbies) ? c.hobbies.join('、') : (c.hobbies || '');
        var _fm = Array.isArray(c.familyMembers) ? c.familyMembers : [];
        var _cr = Array.isArray(c.career) ? c.career : [];
        var _ss = Array.isArray(c.stressSources) ? c.stressSources.join('\n') : '';
        var eh = function(v) { return typeof escHtml === 'function' ? escHtml(v||'') : (v||'').toString().replace(/[<>&"]/g, function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]; }); };
        var html = '<div style="margin:16px 0 8px;color:var(--gold);font-size:14px;cursor:pointer" onclick="var d=document.getElementById(\'renwu-ext-body\');d.style.display=d.style.display===\'none\'?\'block\':\'none\'">▶ 人物志扩展字段 <span style="font-size:11px;color:var(--text-dim)">(字/师承/家谱/仕途/内心——点击展开)</span></div>';
        html += '<div id="renwu-ext-body" style="display:none;padding:10px;background:var(--bg-2);border-radius:6px;margin-bottom:10px;">';
        // 字号
        html += '<div style="display:flex;gap:12px;">';
        html += '<div class="form-group" style="flex:1;"><label>字（表字）</label><input type="text" id="charZi" placeholder="如：子直" value="'+eh(c.zi||c.courtesyName||'')+'"></div>';
        html += '<div class="form-group" style="flex:1;"><label>号</label><input type="text" id="charHaoName" placeholder="如：东堤居士" value="'+eh(c.haoName||'')+'"></div>';
        html += '<div class="form-group" style="flex:1;"><label>辞令风格</label><input type="text" id="charDiction" placeholder="如：清隽/凝重" value="'+eh(c.diction||'')+'"></div>';
        html += '</div>';
        // 人脉
        html += '<div style="display:flex;gap:12px;">';
        html += '<div class="form-group" style="flex:1;"><label>师承</label><input type="text" id="charMentor" placeholder="如：张太傅" value="'+eh(c.mentor||'')+'"></div>';
        html += '<div class="form-group" style="flex:1;"><label>家中身份</label><input type="text" id="charFamilyRole" placeholder="如：长子/庶出" value="'+eh(c.familyRole||'')+'"></div>';
        html += '</div>';
        html += '<div style="display:flex;gap:12px;">';
        html += '<div class="form-group" style="flex:1;"><label>好友（逗号分隔）</label><input type="text" id="charFriends" placeholder="如：李尚书、赵侍郎" value="'+eh(_friends)+'"></div>';
        html += '<div class="form-group" style="flex:1;"><label>爱好（逗号分隔）</label><input type="text" id="charHobbies" placeholder="如：诗文、书画" value="'+eh(_hobbies)+'"></div>';
        html += '</div>';
        // 职事
        html += '<div style="display:flex;gap:12px;">';
        html += '<div class="form-group" style="flex:1;"><label>上司</label><input type="text" id="charSuperior" placeholder="如：江南路总督" value="'+eh(c.superior||'')+'"></div>';
        html += '<div class="form-group" style="flex:1;"><label>兼衔</label><input type="text" id="charConcurrentTitle" placeholder="如：户部观政" value="'+eh(c.concurrentTitle||'')+'"></div>';
        html += '<div class="form-group" style="flex:1;"><label>品级(1-18)</label><input type="number" min="1" max="18" id="charRankLevel" placeholder="9" value="'+(c.rankLevel||'')+'"></div>';
        html += '</div>';
        html += '<div class="form-group"><label>职事描述</label><textarea id="charOfficeDuties" rows="2" placeholder="如：总辖江南府州财赋">'+eh(c.officeDuties||'')+'</textarea></div>';
        // 内心
        html += '<div class="form-group"><label>内心独白（推演中 AI 可改写）</label><textarea id="charInnerThought" rows="2" placeholder="如：漕运当兴，奈何朝中有掣肘者">'+eh(c.innerThought||'')+'</textarea></div>';
        html += '<div class="form-group"><label>压力源（每行一条）</label><textarea id="charStressSources" rows="3" placeholder="如：漕运款缺口&#10;族弟屡试不第">'+eh(_ss)+'</textarea></div>';
        // 族望
        html += '<div class="form-group"><label>族望 (0-100)</label><input type="number" min="0" max="100" id="charClanPrestige" value="'+(c.clanPrestige!==undefined?c.clanPrestige:50)+'"></div>';
        // 家族成员
        html += '<div style="margin-top:12px;color:var(--gold);font-size:13px;display:flex;align-items:center;gap:8px;">家族成员（家谱 SVG 数据源）<button type="button" class="btn" style="font-size:0.7rem;padding:2px 8px;" onclick="if(typeof aiPolishCharFamilyMembers===\'function\')aiPolishCharFamilyMembers(' + editingCharIndex + ');">🪄 AI 润色</button></div>';
        html += '<div id="charFamilyMembersList" style="margin-top:6px;">';
        _fm.forEach(function(m, i) {
          html += _renderFamilyMemberRow(m, i);
        });
        html += '</div>';
        html += '<button type="button" class="btn" style="font-size:0.72rem;padding:2px 8px;margin-top:4px;" onclick="window._addFamilyMember()">+ 添加家族成员</button>';
        // 仕途
        html += '<div style="margin-top:12px;color:var(--gold);font-size:13px;">仕途履历（仕途 Tab 数据源）</div>';
        html += '<div id="charCareerList" style="margin-top:6px;">';
        _cr.forEach(function(ce, i) {
          html += _renderCareerRow(ce, i);
        });
        html += '</div>';
        html += '<button type="button" class="btn" style="font-size:0.72rem;padding:2px 8px;margin-top:4px;" onclick="window._addCareerRow()">+ 添加履历条目</button>';
        html += '</div>';
        _ext.innerHTML = html;
        var _parent = _bioField.closest('.form-group') || _bioField.parentElement;
        if (_parent && _parent.parentElement) {
          _parent.parentElement.insertBefore(_ext, _parent.nextSibling);
        }
      }
    } catch(e) { (window.TM && TM.errors && TM.errors.capture) ? TM.errors.capture(e, 'openCharModal] 扩展字段注入失败:') : console.error('[openCharModal] 扩展字段注入失败:', e); }

    // 特质选择器 + 个人目标（动态注入到性格字段之后）
    var existingPicker = document.getElementById('trait-picker-wrapper');
    if (existingPicker) existingPicker.remove();
    var personalityField = document.getElementById('charPersonality');
    if (personalityField) {
      var wrapper = document.createElement('div');
      wrapper.id = 'trait-picker-wrapper';
      var traitPickerHtml = '<div class="fd full" style="margin-top:0.5rem;"><label>特质选择（从预设表选取）</label>';
      traitPickerHtml += '<div id="trait-picker-area" style="display:flex;flex-wrap:wrap;gap:0.3rem;margin-top:0.3rem;">';
      if (typeof scriptData !== 'undefined' && scriptData.traitDefinitions) {
        scriptData.traitDefinitions.forEach(function(def) {
          var isSelected = c.traitIds && c.traitIds.indexOf(def.id) >= 0;
          traitPickerHtml += '<label style="display:inline-flex;align-items:center;gap:0.2rem;padding:0.15rem 0.4rem;border-radius:10px;font-size:0.75rem;cursor:pointer;'
            + (isSelected ? 'background:var(--gold-d);color:var(--bg-1);' : 'background:var(--bg-4);color:var(--txt-s);')
            + '" title="' + escHtml(def.aiHint || '') + (def.opposite ? ' \u2194 ' + def.opposite : '') + '">'
            + '<input type="checkbox" class="trait-cb" value="' + def.id + '" ' + (isSelected ? 'checked' : '') + ' style="display:none;" onchange="window._traitPickerChanged(this)">'
            + escHtml(def.name) + '</label>';
        });
      }
      traitPickerHtml += '</div></div>';
      // 4.1: 动态目标系统——支持多个长期+短期目标
      var _goals = c.personalGoals || [];
      if (!_goals.length && c.personalGoal) _goals = [{id:'goal_1',type:'power',longTerm:c.personalGoal,shortTerm:'',progress:0,priority:5}];
      traitPickerHtml += '<div class="fd full"><label>\u4E2A\u4EBA\u76EE\u6807 (' + _goals.length + '/3)</label>';
      traitPickerHtml += '<div id="charGoalsList">';
      _goals.forEach(function(g, gi) {
        traitPickerHtml += '<div class="char-goal-row" style="display:flex;gap:4px;margin-bottom:4px;padding:4px;background:var(--bg-secondary,#1a1a25);border-radius:4px;font-size:0.78rem;">' +
          '<select class="cg-type" style="width:60px;font-size:0.72rem;"><option value="power"' + (g.type==='power'?' selected':'') + '>\u6743\u529B</option><option value="wealth"' + (g.type==='wealth'?' selected':'') + '>\u8D22\u5BCC</option><option value="revenge"' + (g.type==='revenge'?' selected':'') + '>\u590D\u4EC7</option><option value="protect"' + (g.type==='protect'?' selected':'') + '>\u4FDD\u62A4</option><option value="knowledge"' + (g.type==='knowledge'?' selected':'') + '>\u6C42\u77E5</option><option value="faith"' + (g.type==='faith'?' selected':'') + '>\u4FE1\u4EF0</option></select>' +
          '<input class="cg-long" value="' + escHtml(g.longTerm||'') + '" placeholder="\u957F\u671F\u76EE\u6807" style="flex:1;font-size:0.75rem;">' +
          '<input class="cg-short" value="' + escHtml(g.shortTerm||'') + '" placeholder="\u77ED\u671F\u76EE\u6807(\u53EF\u7559\u7A7A)" style="flex:1;font-size:0.75rem;">' +
          '<input class="cg-priority" type="number" min="1" max="10" value="' + (g.priority||5) + '" style="width:36px;font-size:0.72rem;" title="\u4F18\u5148\u7EA7">' +
          '<button onclick="this.parentElement.remove()" style="color:var(--red,#e74c3c);background:none;border:none;cursor:pointer;font-size:0.8rem;">\u2715</button></div>';
      });
      traitPickerHtml += '</div>';
      if (_goals.length < 3) {
        traitPickerHtml += '<button onclick="var list=document.getElementById(\'charGoalsList\');if(!list)return;var d=document.createElement(\'div\');d.className=\'char-goal-row\';d.style.cssText=\'display:flex;gap:4px;margin-bottom:4px;padding:4px;background:var(--bg-secondary,#1a1a25);border-radius:4px;font-size:0.78rem;\';d.innerHTML=\'<select class=cg-type style=width:60px;font-size:0.72rem;><option value=power>\u6743\u529B</option><option value=wealth>\u8D22\u5BCC</option><option value=revenge>\u590D\u4EC7</option><option value=protect>\u4FDD\u62A4</option><option value=knowledge>\u6C42\u77E5</option><option value=faith>\u4FE1\u4EF0</option></select><input class=cg-long placeholder=\u957F\u671F\u76EE\u6807 style=flex:1;font-size:0.75rem;><input class=cg-short placeholder=\u77ED\u671F\u76EE\u6807 style=flex:1;font-size:0.75rem;><input class=cg-priority type=number min=1 max=10 value=5 style=width:36px;font-size:0.72rem;><button onclick=this.parentElement.remove() style=color:var(--red);background:none;border:none;cursor:pointer;font-size:0.8rem;>\u2715</button>\';list.appendChild(d);" style="font-size:0.72rem;padding:2px 8px;margin-top:2px;">+ \u6DFB\u52A0\u76EE\u6807</button>';
      }
      traitPickerHtml += '</div>';
      wrapper.innerHTML = traitPickerHtml;
      var parentGroup = personalityField.closest('.form-group') || personalityField.parentElement;
      if (parentGroup && parentGroup.parentElement) {
        parentGroup.parentElement.insertBefore(wrapper, parentGroup.nextSibling);
      }
    }
  }

  // ── 家族成员/仕途条目行渲染 + 动态增删 ──
  function _renderFamilyMemberRow(m, i) {
    m = m || {};
    var eh = function(v) { return typeof escHtml === 'function' ? escHtml(v||'') : (v||'').toString().replace(/["<>&]/g, function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); };
    var relOpts = ['父','母','祖父','祖母','外祖','外祖母','兄','嫂','弟','妹','妻','妾','长子','次子','女','长孙','叔','伯','姑','师','门生','亲家','妻兄','妻弟','其他'];
    var genOpts = [['-2','祖辈'],['-1','父辈'],['0','同辈'],['1','子嗣'],['2','孙辈']];
    var h = '<div class="fam-row" style="display:flex;gap:4px;margin-bottom:3px;align-items:center;flex-wrap:wrap;">';
    h += '<select class="fm-rel" style="width:72px;font-size:0.72rem;">';
    relOpts.forEach(function(r) { h += '<option'+(m.relation===r?' selected':'')+'>'+r+'</option>'; });
    h += '</select>';
    h += '<input class="fm-name" placeholder="姓名" value="'+eh(m.name||'')+'" style="flex:1;min-width:70px;font-size:0.75rem;">';
    h += '<input class="fm-zi" placeholder="字" value="'+eh(m.zi||'')+'" style="width:52px;font-size:0.72rem;">';
    h += '<input class="fm-age" type="number" min="0" max="120" placeholder="岁" value="'+(m.age!==undefined?m.age:'')+'" style="width:48px;font-size:0.72rem;">';
    h += '<select class="fm-gen" style="width:60px;font-size:0.72rem;">';
    genOpts.forEach(function(g) { h += '<option value="'+g[0]+'"'+((m.generation+'')===g[0]?' selected':'')+'>'+g[1]+'</option>'; });
    h += '</select>';
    h += '<input class="fm-title" placeholder="官职/备注" value="'+eh(m.title||m.note||'')+'" style="flex:1;min-width:90px;font-size:0.72rem;">';
    h += '<label style="font-size:0.68rem;"><input class="fm-dead" type="checkbox"'+(m.dead?' checked':'')+'> 已故</label>';
    h += '<label style="font-size:0.68rem;"><input class="fm-inlaw" type="checkbox"'+(m.inLaw?' checked':'')+'> 姻亲</label>';
    h += '<button type="button" onclick="this.parentElement.remove()" style="color:var(--red,#e74c3c);background:none;border:none;cursor:pointer;">✕</button>';
    h += '</div>';
    return h;
  }
  function _renderCareerRow(ce, i) {
    ce = ce || {};
    var eh = function(v) { return typeof escHtml === 'function' ? escHtml(v||'') : (v||'').toString().replace(/["<>&]/g, function(c){return {'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c];}); };
    var h = '<div class="career-row" style="display:flex;gap:4px;margin-bottom:3px;align-items:center;flex-wrap:wrap;">';
    h += '<input class="cr-date" placeholder="咸通七年春" value="'+eh(ce.date||'')+'" style="width:110px;font-size:0.72rem;">';
    h += '<input class="cr-title" placeholder="事件标题" value="'+eh(ce.title||ce.event||'')+'" style="flex:1;min-width:120px;font-size:0.75rem;">';
    h += '<input class="cr-desc" placeholder="描述（可留空）" value="'+eh(ce.desc||'')+'" style="flex:1;min-width:120px;font-size:0.72rem;">';
    h += '<label style="font-size:0.68rem;"><input class="cr-milestone" type="checkbox"'+(ce.milestone?' checked':'')+'> 里程碑</label>';
    h += '<button type="button" onclick="this.parentElement.remove()" style="color:var(--red,#e74c3c);background:none;border:none;cursor:pointer;">✕</button>';
    h += '</div>';
    return h;
  }
  window._addFamilyMember = function() {
    var list = document.getElementById('charFamilyMembersList');
    if (!list) return;
    var d = document.createElement('div');
    d.innerHTML = _renderFamilyMemberRow({}, list.children.length);
    list.appendChild(d.firstChild);
  };
  window._addCareerRow = function() {
    var list = document.getElementById('charCareerList');
    if (!list) return;
    var d = document.createElement('div');
    d.innerHTML = _renderCareerRow({}, list.children.length);
    list.appendChild(d.firstChild);
  };

  window._traitPickerChanged = function(cb) {
    // 对立特质互斥：选中一个时取消对立
    if (cb.checked && typeof scriptData !== 'undefined' && scriptData.traitDefinitions) {
      var def = scriptData.traitDefinitions.find(function(t) { return t.id === cb.value; });
      if (def && def.opposite) {
        var boxes = document.querySelectorAll('.trait-cb');
        boxes.forEach(function(box) { if (box.value === def.opposite) { box.checked = false; box.parentElement.style.background = 'var(--bg-4)'; box.parentElement.style.color = 'var(--txt-s)'; } });
      }
    }
    // 更新视觉
    cb.parentElement.style.background = cb.checked ? 'var(--gold-d)' : 'var(--bg-4)';
    cb.parentElement.style.color = cb.checked ? 'var(--bg-1)' : 'var(--txt-s)';
  };

  function closeCharModal() {
    document.getElementById('charModal').classList.remove('show');
  }

  function charPartyChange() {
    var val = document.getElementById('charParty').value;
    var show = !!val;
    document.getElementById('charPartyRankGroup').style.display = show ? 'block' : 'none';
    document.getElementById('charPartyInfluenceGroup').style.display = show ? 'block' : 'none';
  }

  function charOfficialTitleChange() {
    var officialTitle = document.getElementById('charOfficialTitle').value;
    if (!officialTitle || officialTitle === '无') return;

    // 根据官职自动推断封臣类型
    var inferred = inferVassalTypeFromOfficial(officialTitle);
    if (inferred) {
      var vassalEl = document.getElementById('charVassalType');
      // 检查该封臣类型是否存在于下拉列表中
      var found = false;
      for (var i = 0; i < vassalEl.options.length; i++) {
        if (vassalEl.options[i].value === inferred.vassalType) {
          found = true;
          break;
        }
      }
      if (found) {
        vassalEl.value = inferred.vassalType;
        showToast('已根据官职自动推断封臣类型：' + inferred.vassalType);
      }
    }
  }

  function _syncCharacterOfficeHolder(prevChar, nextChar) {
    if (!nextChar || !nextChar.name || !scriptData) return { synced: false, cleared: 0 };
    var newName = String(nextChar.name || '').trim();
    var oldName = prevChar && prevChar.name ? String(prevChar.name).trim() : '';
    var rawTitle = String(nextChar.officialTitle || '').trim();
    var newTitle = (!rawTitle || rawTitle === '无') ? '' : rawTitle;
    var cleared = 0;
    var roots = [];
    if (scriptData.government && Array.isArray(scriptData.government.nodes)) roots.push(scriptData.government.nodes);
    if (Array.isArray(scriptData.officeTree)) roots.push(scriptData.officeTree);
    if (roots.length === 0) return { synced: false, cleared: 0 };

    var seen = [];
    function _seenPos(p) {
      if (!p) return true;
      if (seen.indexOf(p) >= 0) return true;
      seen.push(p);
      return false;
    }
    function _holdersOf(p) {
      if (Array.isArray(p.actualHolders)) {
        return p.actualHolders.filter(function(h){ return h && h.name && h.generated !== false; }).map(function(h){ return h.name; });
      }
      var arr = [];
      if (p.holder) arr.push(p.holder);
      if (Array.isArray(p.additionalHolders)) arr = arr.concat(p.additionalHolders);
      return arr;
    }
    function _syncLegacy(p) {
      var names = _holdersOf(p);
      p.holder = names[0] || '';
      p.additionalHolders = names.slice(1);
      var est = p.establishedCount != null ? parseInt(p.establishedCount, 10) : (parseInt(p.headCount, 10) || Math.max(1, names.length));
      if (!isNaN(est)) p.vacancyCount = Math.max(0, est - names.length);
      p.actualCount = Array.isArray(p.actualHolders) ? p.actualHolders.length : names.length;
    }
    function _clearName(p, name) {
      if (!name || !p) return false;
      var hit = false;
      if (p.holder === name) { p.holder = ''; hit = true; }
      if (Array.isArray(p.actualHolders)) {
        p.actualHolders.forEach(function(h) {
          if (h && h.name === name) {
            h.name = '';
            h.generated = false;
            if (!h.placeholderId) h.placeholderId = 'ph_' + Math.random().toString(36).slice(2,8);
            hit = true;
          }
        });
      }
      if (Array.isArray(p.additionalHolders)) {
        var before = p.additionalHolders.length;
        p.additionalHolders = p.additionalHolders.filter(function(n){ return n !== name; });
        if (p.additionalHolders.length !== before) hit = true;
      }
      if (hit) _syncLegacy(p);
      return hit;
    }
    function _matchTitle(p, deptName, deptPath, loose) {
      var posName = p && p.name ? String(p.name).trim() : '';
      if (!newTitle || !posName) return false;
      if (newTitle === posName || newTitle === deptName + posName || newTitle === deptPath + '·' + posName) return true;
      if (!loose) return false;
      return newTitle.indexOf(posName) >= 0 && (!!deptName && newTitle.indexOf(deptName) >= 0);
    }
    function _findTarget(loose) {
      var target = null;
      function walk(nodes, path) {
        (nodes || []).forEach(function(n) {
          if (target || !n) return;
          var deptPath = path ? (path + '·' + (n.name || '')) : (n.name || '');
          (n.positions || []).forEach(function(p) {
            if (!target && _matchTitle(p, n.name || '', deptPath, loose)) target = p;
          });
          if (!target && n.subs) walk(n.subs, deptPath);
        });
      }
      roots.forEach(function(r) { if (!target) walk(r, ''); });
      return target;
    }
    function _clearAll(nodes) {
      (nodes || []).forEach(function(n) {
        if (!n) return;
        (n.positions || []).forEach(function(p) {
          if (_seenPos(p)) return;
          if (_clearName(p, oldName)) cleared++;
          if (newName !== oldName && _clearName(p, newName)) cleared++;
        });
        if (n.subs) _clearAll(n.subs);
      });
    }
    roots.forEach(function(r) { _clearAll(r); });
    if (!newTitle) return { synced: false, cleared: cleared };

    var target = _findTarget(false) || _findTarget(true);
    if (!target) return { synced: false, cleared: cleared };
    if (target.holder && target.holder !== newName && Array.isArray(scriptData.characters)) {
      var displaced = scriptData.characters.find(function(c){ return c && c.name === target.holder; });
      if (displaced && (displaced.officialTitle === newTitle || displaced.officialTitle === target.name)) displaced.officialTitle = '无';
    }
    if (!Array.isArray(target.actualHolders)) {
      target.actualHolders = target.holder ? [{ name: target.holder, generated: true }] : [];
    }
    var slot = target.actualHolders.find(function(h){ return h && (!h.name || h.generated === false); });
    if (!slot) {
      slot = target.actualHolders[0] || null;
      if (!slot) {
        slot = { name: '', generated: false };
        target.actualHolders.push(slot);
      }
    }
    slot.name = newName;
    slot.generated = true;
    _syncLegacy(target);
    return { synced: true, cleared: cleared };
  }

  function saveCharacter() {
    var prevCharForOffice = editingCharIndex >= 0 ? (_cloneJson(scriptData.characters[editingCharIndex] || {}) || {}) : null;
    var c = editingCharIndex >= 0 ? (_cloneJson(scriptData.characters[editingCharIndex] || {}) || {}) : {};
    c.name = document.getElementById('charName').value;
    c.type = document.getElementById('charType').value;
    c.title = document.getElementById('charTitle').value;
    c.faction = document.getElementById('charFaction').value;
    c.role = document.getElementById('charRole').value;
    c.bio = document.getElementById('charBio').value;
    c.age = document.getElementById('charAge').value;
    c.gender = document.getElementById('charGender').value;
    c.ethnicity = document.getElementById('charEthnicity').value;
    c.birthplace = document.getElementById('charBirthplace').value;
    c.occupation = document.getElementById('charOccupation').value;
    c.location = document.getElementById('charLocation') ? document.getElementById('charLocation').value : '';
    c.party = document.getElementById('charParty').value;
    c.partyRank = document.getElementById('charPartyRank').value;
    c.partyInfluence = document.getElementById('charPartyInfluence').value !== '' ? +document.getElementById('charPartyInfluence').value : undefined;
    c.class = document.getElementById('charClass') ? document.getElementById('charClass').value : '';
    c.officialTitle = document.getElementById('charOfficialTitle').value;
    c.vassalType = document.getElementById('charVassalType').value;
    c.stance = document.getElementById('charStance').value;
    c.personality = document.getElementById('charPersonality').value;
    c.persona = document.getElementById('charPersona').value;
    c.learning = document.getElementById('charLearning').value;
    c.playerRelation = document.getElementById('charPlayerRelation').value;
    c.faith = document.getElementById('charFaith').value;
    c.culture = document.getElementById('charCulture').value;
    c.portrait = document.getElementById('charPortraitData').value;
    c.appearance = (document.getElementById('charAppearance') || {}).value || '';
    c.loyalty = +document.getElementById('charLoyalty').value;
    c.ambition = +document.getElementById('charAmbition').value;
    c.benevolence = +document.getElementById('charBenevolence').value;
    c.intelligence = +document.getElementById('charIntelligence').value;
    c.valor = +document.getElementById('charValor').value;
    c.military = +(document.getElementById('charMilitary') || {value:50}).value;
    c.administration = +(document.getElementById('charAdministration') || {value:50}).value;
    c.management = +(document.getElementById('charManagement') || {value:50}).value;
    c.charisma = +(document.getElementById('charCharisma') || {value:50}).value;
    c.diplomacy = +(document.getElementById('charDiplomacy') || {value:50}).value;
    var birthTimeRaw = (document.getElementById('charBirthTime') || {}).value || '';
    birthTimeRaw = birthTimeRaw.trim();
    if (birthTimeRaw) {
      c.birthTime = birthTimeRaw;
      var birthMatch = birthTimeRaw.match(/-?\d+/);
      if (birthMatch) {
        var birthYear = parseInt(birthMatch[0], 10);
        if (!isNaN(birthYear)) c.birthYear = birthYear;
      }
    } else {
      delete c.birthTime;
      delete c.birthYear;
    }
    // 收集五常覆盖值
    var _wcOverride = {};
    var _wcHasOverride = false;
    ['ren','yi','li','zhi','xin'].forEach(function(id, idx) {
      var keys = ['仁','义','礼','智','信'];
      var el = document.getElementById('charWuchang_'+id);
      if (el && el.value !== '') { _wcOverride[keys[idx]] = parseInt(el.value); _wcHasOverride = true; }
      else { _wcOverride[keys[idx]] = null; }
    });
    if (_wcHasOverride) c.wuchangOverride = _wcOverride;
    else delete c.wuchangOverride;
    // 收集家世
    var _fsDi = (document.getElementById('charFamilyStatus')||{}).value;
    var _fsCn = (document.getElementById('charClanName')||{}).value;
    var _fsPr = (document.getElementById('charFamilyPrestige')||{}).value;
    if (_fsDi) {
      c.familyStatus = { 门第: _fsDi, 郡望: _fsCn || '', 声望: parseInt(_fsPr) || 50 };
    } else {
      delete c.familyStatus;
    }
    c.father = (document.getElementById('charFather')||{}).value || '';
    c.mother = (document.getElementById('charMother')||{}).value || '';
    var _isSpCb2 = document.getElementById('charIsSpouse');
    var _spName = (document.getElementById('charSpouse')||{}).value || '';
    _spName = _spName.trim();
    var _spChecked = _isSpCb2 ? _isSpCb2.checked : false;
    if (_spName) {
      c.spouse = _spName;
    } else if (_spChecked) {
      c.spouse = true;
    } else {
      delete c.spouse;
    }
    if (_spChecked && c.spouse) {
      c.spouseRank = (document.getElementById('charSpouseRank')||{}).value || 'consort';
    } else {
      delete c.spouseRank;
    }
    var deepStateRaw = (document.getElementById('charDeepStateJson') || {}).value || '';
    deepStateRaw = deepStateRaw.trim();
    if (deepStateRaw) {
      var deepState;
      try {
        deepState = JSON.parse(deepStateRaw);
      } catch(e) {
        showToast('结构引用 JSON 格式有误');
        return;
      }
      if (deepState && typeof deepState === 'object' && !Array.isArray(deepState)) {
        ['partyRef','factionRef','officeRef','relations','lastInteractionMemory','recognitionState'].forEach(function(k) {
          if (Object.prototype.hasOwnProperty.call(deepState, k)) c[k] = deepState[k];
        });
      }
    }
    // 收集选中的特质（新版：从弹窗的traits选择器中读取）
    if (window._selectedTraitsForChar && Array.isArray(window._selectedTraitsForChar)) {
      c.traits = window._selectedTraitsForChar.slice();
      c.traitIds = window._selectedTraitsForChar.slice();
    } else {
      // 兼容旧 traitIds 字段
      var selectedTraits = [];
      document.querySelectorAll('.trait-cb:checked').forEach(function(cb) { selectedTraits.push(cb.value); });
      c.traits = selectedTraits.slice();
      c.traitIds = selectedTraits.slice();
    }
    // 4.1: 收集动态目标
    var _goalRows = document.querySelectorAll('#charGoalsList .char-goal-row');
    var _collectedGoals = [];
    _goalRows.forEach(function(row, gi) {
      var tp = row.querySelector('.cg-type'); var lg = row.querySelector('.cg-long');
      var sh = row.querySelector('.cg-short'); var pr = row.querySelector('.cg-priority');
      if (lg && lg.value.trim()) {
        _collectedGoals.push({
          id: 'goal_' + (gi+1),
          type: tp ? tp.value : 'power',
          longTerm: lg.value.trim(),
          shortTerm: sh ? sh.value.trim() : '',
          progress: 0,
          priority: pr ? parseInt(pr.value)||5 : 5,
          createdTurn: 0,
          dynamic: true
        });
      }
    });
    c.personalGoals = _collectedGoals;
    c.personalGoal = _collectedGoals.length > 0 ? _collectedGoals[0].longTerm : '';

    // 收集人物志扩展字段
    var _gv = function(id) { var el = document.getElementById(id); return el ? el.value : ''; };
    var _gn = function(id) { var v = _gv(id); return v === '' ? undefined : (+v); };
    if (_gv('charZi')) c.zi = _gv('charZi');
    if (_gv('charHaoName')) c.haoName = _gv('charHaoName');
    if (_gv('charDiction')) c.diction = _gv('charDiction');
    if (_gv('charMentor')) c.mentor = _gv('charMentor');
    if (_gv('charFamilyRole')) c.familyRole = _gv('charFamilyRole');
    if (_gv('charFriends')) c.friends = _gv('charFriends').split(/[、，,]+/).map(function(s){return s.trim();}).filter(Boolean);
    if (_gv('charHobbies')) c.hobbies = _gv('charHobbies').split(/[、，,]+/).map(function(s){return s.trim();}).filter(Boolean);
    if (_gv('charSuperior')) c.superior = _gv('charSuperior');
    if (_gv('charConcurrentTitle')) c.concurrentTitle = _gv('charConcurrentTitle');
    if (_gn('charRankLevel') !== undefined) c.rankLevel = _gn('charRankLevel');
    if (_gv('charOfficeDuties')) c.officeDuties = _gv('charOfficeDuties');
    if (_gv('charInnerThought')) c.innerThought = _gv('charInnerThought');
    if (_gv('charStressSources')) c.stressSources = _gv('charStressSources').split(/\n+/).map(function(s){return s.trim();}).filter(Boolean);
    if (_gn('charClanPrestige') !== undefined) c.clanPrestige = _gn('charClanPrestige');
    // 家族成员
    var _famList = document.getElementById('charFamilyMembersList');
    if (_famList) {
      var _famRows = _famList.querySelectorAll('.fam-row');
      c.familyMembers = [];
      _famRows.forEach(function(row) {
        var name = (row.querySelector('.fm-name')||{}).value || '';
        if (!name.trim()) return;
        c.familyMembers.push({
          name: name.trim(),
          zi: (row.querySelector('.fm-zi')||{}).value || '',
          relation: (row.querySelector('.fm-rel')||{}).value || '',
          generation: parseInt((row.querySelector('.fm-gen')||{}).value || '0'),
          age: ((row.querySelector('.fm-age')||{}).value) ? parseInt(row.querySelector('.fm-age').value) : undefined,
          title: (row.querySelector('.fm-title')||{}).value || '',
          dead: !!(row.querySelector('.fm-dead')||{}).checked,
          inLaw: !!(row.querySelector('.fm-inlaw')||{}).checked
        });
      });
    }
    // 仕途
    var _careerList = document.getElementById('charCareerList');
    if (_careerList) {
      var _crRows = _careerList.querySelectorAll('.career-row');
      c.career = [];
      _crRows.forEach(function(row) {
        var title = (row.querySelector('.cr-title')||{}).value || '';
        if (!title.trim()) return;
        c.career.push({
          date: (row.querySelector('.cr-date')||{}).value || '',
          title: title.trim(),
          desc: (row.querySelector('.cr-desc')||{}).value || '',
          milestone: !!(row.querySelector('.cr-milestone')||{}).checked
        });
      });
    }

    if (!c.name) { showToast('请输入姓名'); return; }
    if (editingCharIndex >= 0) {
      scriptData.characters[editingCharIndex] = c;
    } else {
      scriptData.characters.push(c);
    }
    _syncCharacterOfficeHolder(prevCharForOffice, c);
    closeCharModal();
    renderCharacters();
    autoSave();
    showToast(
      editingCharIndex >= 0 ? '人物已更新' : '人物已添加'
    );
  }

  function editCharacter(i) { openCharModal(i); }

  function deleteCharacter(i) {
    if (typeof EditHistory !== 'undefined') EditHistory.push('\u5220\u9664\u89D2\u8272 ' + ((scriptData.characters[i]||{}).name||i));
    var deleted = scriptData.characters[i];
    var dName = deleted ? deleted.name : '';
    scriptData.characters.splice(i, 1);
    // 级联清理：清除其他面板中对该角色的引用
    if (dName) {
      // 事件linkedChars
      ['historical','random','conditional','story','chain'].forEach(function(k) {
        if (scriptData.events && scriptData.events[k]) {
          scriptData.events[k].forEach(function(e) {
            if (e.linkedChars && Array.isArray(e.linkedChars)) e.linkedChars = e.linkedChars.filter(function(c){return c!==dName;});
          });
        }
      });
      // 行政区划governor
      if (scriptData.adminHierarchy) {
        Object.keys(scriptData.adminHierarchy).forEach(function(k) {
          var ah = scriptData.adminHierarchy[k];
          if (ah && ah.divisions) (function _clr(divs){divs.forEach(function(d){if(d.governor===dName)d.governor='';if(d.children)_clr(d.children);});})(ah.divisions);
        });
      }
      // 官制树position.holder
      (function _clrOffRoots() {
        var roots = [];
        if (scriptData.government && scriptData.government.nodes) roots.push(scriptData.government.nodes);
        if (Array.isArray(scriptData.officeTree)) roots.push(scriptData.officeTree);
        var seen = [];
        function _syncLegacy(p) {
          var names = Array.isArray(p.actualHolders)
            ? p.actualHolders.filter(function(h){ return h && h.name && h.generated !== false; }).map(function(h){ return h.name; })
            : (p.holder ? [p.holder] : []);
          p.holder = names[0] || '';
          p.additionalHolders = names.slice(1);
          var est = p.establishedCount != null ? parseInt(p.establishedCount, 10) : (parseInt(p.headCount, 10) || Math.max(1, names.length));
          if (!isNaN(est)) p.vacancyCount = Math.max(0, est - names.length);
        }
        function _clrOff(nodes){
          nodes.forEach(function(n){
            if (!n) return;
            if(n.positions)n.positions.forEach(function(p){
              if(!p || seen.indexOf(p)>=0) return;
              seen.push(p);
              var hit = false;
              if(p.holder===dName){p.holder='';hit=true;}
              if(Array.isArray(p.actualHolders)){
                p.actualHolders.forEach(function(h){ if(h && h.name===dName){ h.name=''; h.generated=false; if(!h.placeholderId) h.placeholderId='ph_'+Math.random().toString(36).slice(2,8); hit=true; } });
              }
              if(Array.isArray(p.additionalHolders)){
                var before=p.additionalHolders.length;
                p.additionalHolders=p.additionalHolders.filter(function(nm){return nm!==dName;});
                if(p.additionalHolders.length!==before) hit=true;
              }
              if(hit)_syncLegacy(p);
            });
            if(n.subs)_clrOff(n.subs);
          });
        }
        roots.forEach(_clrOff);
      })();
      // 党派leader
      if (scriptData.parties) scriptData.parties.forEach(function(p){if(p.leader===dName)p.leader='';});
    }
    renderCharacters();
    autoSave();
    showToast('已删除');
  }


  function charPortraitFileChange(input) {
    var file = input.files && input.files[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      showToast('请选择图片文件');
      return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
      var data = e.target.result;
      document.getElementById('charPortraitData').value = data;
      var prev = document.getElementById('charPortraitPreview');
      var empty = document.getElementById('charPortraitEmpty');
      prev.src = data;
      prev.style.display = 'block';
      empty.style.display = 'none';
    };
    reader.readAsDataURL(file);
  }

  function clearCharPortrait() {
    document.getElementById('charPortraitData').value = '';
    var prev = document.getElementById('charPortraitPreview');
    var empty = document.getElementById('charPortraitEmpty');
    prev.src = '';
    prev.style.display = 'none';
    empty.style.display = 'flex';
  }

  // ============================================================
  // AI智能立绘生成系统
  // Step 1: AI文本模型生成外貌描述（查史料+朝代服饰+年龄）
  // Step 2: 调用图片生成API（DALL-E等）生成立绘
  // ============================================================

  /** 读取生图API配置（独立于主API，全局通用） */
  function _getImageAPIConfig() {
    // 优先读取独立的生图API配置
    var imgCfg = {};
    try { imgCfg = JSON.parse(localStorage.getItem('tm_api_image') || '{}'); } catch(e) {}
    if (imgCfg.key && imgCfg.url) return {supported: true, key: imgCfg.key, url: imgCfg.url, model: imgCfg.model || 'dall-e-3'};
    // 未单独配置→尝试从主API推断
    var mainCfg = {};
    try { mainCfg = JSON.parse(localStorage.getItem('tm_api') || '{}'); } catch(e) {}
    var mainUrl = (mainCfg.url || '').toLowerCase();
    if (mainUrl.indexOf('openai.com') >= 0 && mainCfg.key) {
      return {supported: true, key: mainCfg.key, url: 'https://api.openai.com/v1/images/generations', model: 'dall-e-3', inferred: true};
    }
    if (mainCfg.key && mainUrl) {
      var baseUrl = mainUrl.replace(/\/chat\/completions.*$/, '').replace(/\/v1\/.*$/, '').replace(/\/+$/, '');
      return {supported: true, key: mainCfg.key, url: baseUrl + '/v1/images/generations', model: 'dall-e-3', inferred: true, uncertain: true};
    }
    return {supported: false};
  }

  /** 朝代→汉服形制关键词映射（参考，AI prompt中会要求AI进一步确认具体形制） */
  function _getDynastyDressKeywords(dynasty) {
    var d = (dynasty || '').replace(/[朝代国]$/,'');
    var map = {
      // 先秦
      '\u5546': 'Shang dynasty clothing, simple draped garment, leather belt, bronze ornaments, animal-hide decorations',
      '\u5468': 'Zhou dynasty, xuanduan formal robe (black upper red lower), shenyi deep robe, wide belt with jade pendant (peiyu)',
      '\u897F\u5468': 'Western Zhou dynasty, xuanduan formal robe, ceremonial mianguan crown, jade belt ornaments',
      '\u4E1C\u5468': 'Eastern Zhou dynasty, deep robe shenyi, cross-collar wide sleeves, leather armor for warriors',
      '\u6625\u79CB': 'Spring and Autumn period, shenyi deep robe with curved hem (ququ), bronze belt hooks, simple hair crown',
      '\u6218\u56FD': 'Warring States period, cross-collar shenyi robe, narrow sleeves for mobility, lacquered leather armor for generals',
      // 秦汉
      '\u79E6': 'Qin dynasty, black formal shenyi deep robe (Qin favored black color), three-beam crown (sanlianguan), military terracotta-warrior style armor',
      '\u6C49': 'Han dynasty, ququ shenyi curved-hem robe, zhiju shenyi straight-hem robe, wide flowing sleeves, silk gauze layering, winged crown (jinxianguan)',
      '\u897F\u6C49': 'Western Han dynasty, ququ shenyi curved-hem robe, deep black and vermillion colors, jade cicada hair ornament',
      '\u4E1C\u6C49': 'Eastern Han dynasty, zhiju shenyi straight-hem robe, wide sleeves, tall lacquered crown (gaoshan guan), elaborate sash',
      // 三国两晋
      '\u4E09\u56FD': 'Three Kingdoms period, Han-style shenyi robes, military figures in lamellar armor (zhajia), scholars in loose flowing robes',
      '\u9B4F': 'Cao Wei, Han-style formal robes with military influence, officials in black gauze cap (wusha mao)',
      '\u8700': 'Shu Han, Han-style shenyi, Sichuan brocade (shujin) fabric, practical military attire',
      '\u5434': 'Eastern Wu, lighter southern Han-style clothing, silk and ramie fabrics',
      '\u664B': 'Jin dynasty, baoyi bodai style (loose robe with broad sash), wide flowing sleeves, elegant debauchee aesthetic, scholars barefoot with open collar',
      '\u897F\u664B': 'Western Jin dynasty, wide-sleeved baoyi bodai robes, jade and gold belt ornaments, extravagant silk layering',
      '\u4E1C\u664B': 'Eastern Jin dynasty, refined wide-sleeve robes, literati aesthetic, bamboo and orchid motifs, simple elegance',
      // 南北朝
      '\u5357\u5317\u671D': 'Northern and Southern dynasties, NORTH: kuze trousers-and-tunic from nomadic influence mixed with Han robes, round-collar robe emerging; SOUTH: continuation of Wei-Jin elegant wide-sleeve baoyi bodai, refined and flowing',
      '\u5357\u671D': 'Southern dynasties (Song/Qi/Liang/Chen), Wei-Jin style wide flowing robes, baoyi bodai, silk gauze layering, refined literati elegance, cross-collar with wide sleeves',
      '\u5317\u671D': 'Northern dynasties (Wei/Qi/Zhou), nomadic-Han fusion clothing, round-collar narrow-sleeve robe (yuanlingpao prototype), kuze trousers and tunic, military boots, standing collar emerging',
      '\u5317\u9B4F': 'Northern Wei, xianbei-Han fusion robes, early round-collar robe, military figures in heavy armor, after Xiaowen reform adopting Han-style court robes',
      '\u5317\u9F50': 'Northern Qi, round-collar narrow-sleeve robes, military-influenced clothing, nomadic riding boots',
      '\u5317\u5468': 'Northern Zhou, practical round-collar robes, mixed Xianbei-Han style, military armor',
      '\u5357\u6881': 'Liang dynasty, elegant wide-sleeve Wei-Jin robes, Buddhist influence in fabric patterns, lotus motifs',
      '\u5357\u9648': 'Chen dynasty, southern refined robes, lighter fabrics, continuation of Liang style',
      // 隋唐
      '\u968B': 'Sui dynasty, formal round-collar robe (yuanlingpao) for officials, cross-collar ruqun for women, transitional style between Northern-Southern and Tang',
      '\u5510': 'Tang dynasty, officials in round-collar robe (yuanlingpao) with leather belt and boots, women in high-waisted cross-collar ruqun (chest-length skirt qixiongruqun) or half-arm jacket (banbi), pibo silk shawl, elaborate hair buns (gaofa), bright colors (vermillion/emerald/gold)',
      // 五代十国
      '\u4E94\u4EE3': 'Five Dynasties period, Tang-style round-collar robes slightly simplified, practical military attire for warlord era, fur-trimmed winter robes',
      '\u4E94\u4EE3\u5341\u56FD': 'Five Dynasties and Ten Kingdoms, Tang-style robes with regional variations, southern courts more elaborate, northern courts more military-practical',
      '\u540E\u5510': 'Later Tang dynasty, Tang-style round-collar robe, military riding attire with Shatuo Turkish influence',
      '\u540E\u5468': 'Later Zhou dynasty, simplified Tang-style official robes, military-focused court attire',
      // 宋
      '\u5B8B': 'Song dynasty, refined narrow-sleeve robes, beizi open-front overcoat, zhiduo straight-body robe, scholars in black gauze futou cap, women in beizi jacket over ruqun skirt, muted elegant colors (celadon/ivory/light blue), understated sophistication',
      '\u5317\u5B8B': 'Northern Song dynasty, refined court robes, futou black gauze cap, long gown with narrow sleeves, scholars carrying folding fans, muted celadon and ivory tones',
      '\u5357\u5B8B': 'Southern Song dynasty, similar to Northern Song but slightly more relaxed, southern silk fabrics, continued refined beizi style, practical simplicity',
      // 辽金西夏
      '\u8FBD': 'Liao dynasty Khitan clothing, left-lapel robe (zuoren), fur-trimmed winter coat, leather riding boots, braided hair, round felt cap, nomadic riding attire fused with Chinese silk robes',
      '\u91D1': 'Jin dynasty Jurchen clothing, left-lapel narrow-sleeve robe, fur collar and cuffs, military armor with leather scales, after sinicization adopting Song-style court robes, women in narrow-sleeve changyi',
      '\u897F\u590F': 'Western Xia Tangut clothing, Tibetan-Chinese fusion robes, distinctive tall felt hat, fur-trimmed robes, Buddhist monk robes for clergy, leather and wool fabrics',
      // 元
      '\u5143': 'Yuan dynasty Mongol-Chinese clothing, zhisunfu tight-sleeved robe with pleated skirt (distinctive Yuan garment), Mongolian deel robe, bijia sleeveless vest over robe, wide-brimmed hat (limaomao), fur-lined winter robes, bright colors (red/blue/gold), cloud-collar (yunjiang) decoration, officials in zhisunfu for banquets, Chinese scholars retaining Song-style robes',
      // 明
      '\u660E': 'Ming dynasty hanfu, officials in round-collar robe with mandarin-square patch (buzi) indicating rank, flying-fish robe (feiyufu) and python robe (mangpao) for high officials, scholars in zhiduo straight robe with wide sleeves, women in stand-up collar aoqun jacket-skirt and mamianqun horse-face pleated skirt, wushamao black-wing hat, rich colors (vermillion/sapphire/gold), elaborate cloud-pattern embroidery',
      // 清
      '\u6E05': 'Qing dynasty Manchu-style clothing, men in changpao long robe with magua riding jacket, mandarin collar, horseshoe cuffs (matiuxiu), officials with peacock-feather hat ornament (hualing) and buzi rank patch, women in qizhuang banner-dress or aoqun, distinctive queue hairstyle for men, elaborate headdress (dianzi) for Manchu women, forbidden to wear Ming-style hanfu',
      // 通用
      '\u6C11\u56FD': 'Republic of China era, zhongshan suit (Mao suit) for men, modified qipao cheongsam for women, Western suit influence'
    };
    // 模糊匹配：如果精确匹配失败，尝试包含匹配
    if (map[d]) return map[d];
    for (var k in map) { if (d.indexOf(k) >= 0 || k.indexOf(d) >= 0) return map[k]; }
    // 兜底：让AI自行搜索
    return 'ancient Chinese historically accurate period clothing from the ' + dynasty + ' era, AI should research the exact clothing style (hanfu zhidu) of this specific dynasty';
  }

  /** 调用图片生成API（DALL-E等） */
  async function _callImageGenAPI(imagePrompt) {
    var imgCfg = _getImageAPIConfig();
    if (!imgCfg.supported) throw new Error('\u5F53\u524DAPI\u4E0D\u652F\u6301\u56FE\u7247\u751F\u6210\u3002\u8BF7\u4F7F\u7528OpenAI API\u6216\u517C\u5BB9DALL-E\u7684\u670D\u52A1\u3002');

    var resp = await fetch(imgCfg.url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + imgCfg.key
      },
      body: JSON.stringify({
        model: imgCfg.model || 'dall-e-3',
        prompt: 'STYLE: Ultra-photorealistic photograph, NOT illustration/cartoon/anime/painting/3D render. Must look like a real person photographed by a camera. ' + imagePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'hd',
        style: 'natural',
        response_format: 'b64_json'
      })
    });

    if (!resp.ok) {
      var errBody = '';
      try { errBody = (await resp.json()).error.message; } catch(e) { errBody = resp.status + ' ' + resp.statusText; }
      throw new Error('\u56FE\u7247\u751F\u6210\u5931\u8D25: ' + errBody);
    }

    var data = await resp.json();
    if (data.data && data.data[0]) {
      if (data.data[0].b64_json) return 'data:image/png;base64,' + data.data[0].b64_json;
      if (data.data[0].url) return data.data[0].url;
    }
    throw new Error('\u56FE\u7247\u751F\u6210\u8FD4\u56DE\u683C\u5F0F\u5F02\u5E38');
  }

  /** 主入口：AI智能生成立绘（仅图片，外貌描述由AI智能生成角色时自动包含） */
  async function aiGenCharPortrait() {
    var name = document.getElementById('charName').value || '';
    var gender = document.getElementById('charGender').value || '';
    var age = document.getElementById('charAge').value || '';
    var role = document.getElementById('charRole').value || '';
    var appearance = (document.getElementById('charAppearance') || {}).value || '';
    var dynasty = scriptData.dynasty || scriptData.era || '';
    if (!name) { showToast('\u8BF7\u5148\u8F93\u5165\u59D3\u540D'); return; }

    // 检测图片生成能力
    var imgSupport = _getImageAPIConfig();
    if (!imgSupport.supported) {
      showToast('\u672A\u914D\u7F6E\u751F\u56FEAPI\u3002\u8BF7\u5728API\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u201C\u667A\u80FD\u751F\u56FEAPI\u201D\uFF08\u652F\u6301DALL-E\u7684\u670D\u52A1\uFF09\u3002');
      return;
    }

    // 收集职业/民族信息用于服饰差异
    var ethnicity = (document.getElementById('charEthnicity') || {}).value || '';
    var officialTitle = (document.getElementById('charOfficialTitle') || {}).value || '';
    var charType = (document.getElementById('charType') || {}).value || '';

    // 构建服饰差异指导
    var _dressContext = '';
    // 性别差异
    if (gender === '\u5973') {
      _dressContext += 'FEMALE clothing style: women\'s garments of the era (ruqun/aoqun/skirts), feminine accessories (hairpins, earrings, silk flowers). ';
    } else {
      _dressContext += 'MALE clothing style: men\'s formal/official robes of the era. ';
    }
    // 职业差异
    var _roleStr = (role || officialTitle || '').toLowerCase();
    if (/将|军|武|兵|帅|尉|校/.test(_roleStr) || charType === 'military') {
      _dressContext += 'MILITARY figure: should wear armor or military attire appropriate to the era, NOT scholar robes. ';
    } else if (/僧|道|佛|寺|观|法师|禅/.test(_roleStr)) {
      _dressContext += 'RELIGIOUS figure: Buddhist monk robes (jiasha/haiqingyi) or Daoist priest robes (daopao), NOT secular official clothing. ';
    } else if (/商|贾|买卖/.test(_roleStr)) {
      _dressContext += 'MERCHANT: wealthy but non-official clothing, fine silk but without official rank insignia. ';
    } else if (/农|民|百姓|奴|婢|仆/.test(_roleStr)) {
      _dressContext += 'COMMONER/PEASANT: simple coarse cloth (buyi), muted colors, practical clothing, NOT silk official robes. ';
    } else if (/妃|后|嫔|昭仪|贵人|才人/.test(_roleStr)) {
      _dressContext += 'IMPERIAL CONSORT: luxurious palace attire, elaborate headdress (fengguanxiapei for empress), rich embroidery, gold/jade ornaments. ';
    }
    // 民族差异
    if (ethnicity) {
      var _ethLower = ethnicity.toLowerCase();
      if (/蒙古|蒙/.test(_ethLower)) _dressContext += 'MONGOLIAN ethnicity: Mongolian deel robe, fur-trimmed, distinctive Mongol hat, leather boots, nomadic horseback-riding attire. ';
      else if (/满|女真|金/.test(_ethLower)) _dressContext += 'MANCHU/JURCHEN ethnicity: Manchu-style robe with horseshoe cuffs, left-lapel, distinctive Jurchen/Manchu hairstyle. ';
      else if (/鲜卑|拓跋/.test(_ethLower)) _dressContext += 'XIANBEI ethnicity: Xianbei nomadic-style robe, fur collar, riding boots, braided hair. ';
      else if (/突厥|回鹘|维吾尔/.test(_ethLower)) _dressContext += 'TURKIC/UYGHUR ethnicity: Central Asian-influenced clothing, distinctive headwear, fur-trimmed robes. ';
      else if (/吐蕃|藏/.test(_ethLower)) _dressContext += 'TIBETAN ethnicity: Tibetan chuba robe, one-shoulder draped style, turquoise and coral ornaments. ';
      else if (/契丹/.test(_ethLower)) _dressContext += 'KHITAN ethnicity: Khitan left-lapel robe, felt cap, leather riding boots, braided hair. ';
      else if (/党项|羌/.test(_ethLower)) _dressContext += 'TANGUT ethnicity: Tangut-style robe, distinctive tall hat, wool and leather materials. ';
      else if (/汉/.test(_ethLower) || !ethnicity) { /* 默认汉族，已由朝代映射覆盖 */ }
      else { _dressContext += ethnicity + ' ethnicity: clothing should reflect this ethnic group\'s traditional attire mixed with ' + dynasty + ' era Chinese influences. '; }
    }

    try {
      var imagePrompt = '';
      var dressKeywords = _getDynastyDressKeywords(dynasty);

      if (appearance) {
        showToast('\u6B63\u5728\u6839\u636E\u5916\u8C8C\u63CF\u8FF0\u751F\u6210\u7ACB\u7ED8\u2026');
        var translatePrompt = 'Translate the following Chinese character appearance description into a detailed English DALL-E image generation prompt.\n' +
          'Dynasty: ' + dynasty + '\nDress style reference: ' + dressKeywords + '\n' +
          _dressContext + '\n' +
          'Character: ' + name + ', ' + (gender||'male') + ', age ' + (age||30) + ', ' + (role||officialTitle||'') + (ethnicity ? ', ethnicity: ' + ethnicity : '') +
          '\nAppearance: ' + appearance +
          '\n\nOutput ONLY the English prompt (no explanation). Must be photorealistic, NOT cartoon/anime.';
        var translated = await callAIEditor(translatePrompt, 500);
        imagePrompt = 'Photorealistic portrait photograph, ' + translated.replace(/```/g,'').trim() + ', highly detailed face, professional studio lighting, 4K UHD, shallow depth of field';
      } else {
        showToast('\u65E0\u5916\u8C8C\u63CF\u8FF0\uFF0C\u5EFA\u8BAE\u5148AI\u751F\u6210\u89D2\u8272\u3002\u7528\u57FA\u7840\u4FE1\u606F\u751F\u6210\u2026');
        imagePrompt = 'Photorealistic portrait photograph of an ancient Chinese ' + dynasty + ' dynasty ' + (gender === '\u5973' ? 'woman' : 'man') + ', age ' + (age || 30) + ', ' + (role||officialTitle ? role||officialTitle + ', ' : '') + dressKeywords + '. ' + _dressContext + 'Highly detailed face, professional studio lighting, 4K UHD, shallow depth of field';
      }

      showToast('\u6B63\u5728\u751F\u6210\u7ACB\u7ED8\u56FE\u7247\u2026\uFF08\u53EF\u80FD\u9700\u898130\u79D2\uFF09');
      var imageDataUrl = (typeof ImageAPI !== 'undefined') ? await ImageAPI.generate(imagePrompt) : await _callImageGenAPI(imagePrompt);

      // 写入立绘
      var dataInp = document.getElementById('charPortraitData');
      var prevImg = document.getElementById('charPortraitPreview');
      var emptyDiv = document.getElementById('charPortraitEmpty');
      if (dataInp) dataInp.value = imageDataUrl;
      if (prevImg) { prevImg.src = imageDataUrl; prevImg.style.display = 'block'; }
      if (emptyDiv) emptyDiv.style.display = 'none';

      showToast('\u2705 \u7ACB\u7ED8\u751F\u6210\u6210\u529F\uFF01');
    } catch(e) {
      console.warn('[Portrait]', e);
      showToast('\u7ACB\u7ED8\u751F\u6210\u5931\u8D25: ' + e.message);
    }
  }

  /** 生成指定立绘——玩家自己写提示词 */
  function openCustomPortraitPrompt() {
    var imgSupport = _getImageAPIConfig();
    if (!imgSupport.supported) {
      showToast('\u672A\u914D\u7F6E\u751F\u56FEAPI\u3002\u8BF7\u5728API\u8BBE\u7F6E\u4E2D\u914D\u7F6E\u667A\u80FD\u751F\u56FEAPI\u3002');
      return;
    }
    // 弹窗
    var ov = document.createElement('div');
    ov.style.cssText = 'position:fixed;inset:0;z-index:1200;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);';
    var name = (document.getElementById('charName') || {}).value || '';
    ov.innerHTML = '<div style="background:var(--bg-secondary,#1a1a25);border:1px solid var(--gold-dark,#8b7355);border-radius:12px;width:90%;max-width:480px;padding:1.5rem;">' +
      '<div style="font-size:1rem;font-weight:700;color:var(--gold,#c9a84c);margin-bottom:0.8rem;">\u751F\u6210\u6307\u5B9A\u7ACB\u7ED8' + (name ? ' \u2014 ' + escHtml(name) : '') + '</div>' +
      '<div style="font-size:0.8rem;color:var(--text-secondary,#888);margin-bottom:0.6rem;">\u8BF7\u7528\u81EA\u7136\u8BED\u8A00\u63CF\u8FF0\u4F60\u60F3\u8981\u7684\u7ACB\u7ED8\u6548\u679C\uFF0CAI\u4F1A\u636E\u6B64\u751F\u6210\u3002\u4F8B\u5982\uFF1A\u201C\u4E00\u4F4D\u7A7F\u7740\u660E\u4EE3\u98DE\u9C7C\u670D\u7684\u4E2D\u5E74\u5C06\u9886\uFF0C\u9762\u5BB9\u575A\u6BC5\uFF0C\u7565\u6709\u4F24\u75A4\u201D</div>' +
      '<textarea id="_customPortraitPrompt" rows="4" style="width:100%;font-size:0.85rem;padding:0.5rem;border:1px solid var(--border,#333);border-radius:6px;background:var(--bg-tertiary,#111);color:var(--text-primary,#eee);resize:vertical;" placeholder="\u63CF\u8FF0\u4F60\u60F3\u8981\u7684\u7ACB\u7ED8\u6548\u679C\u2026"></textarea>' +
      '<div style="display:flex;gap:8px;margin-top:0.8rem;justify-content:flex-end;">' +
      '<button class="btn" onclick="this.closest(\'div[style*=fixed]\').remove();">\u53D6\u6D88</button>' +
      '<button class="btn-gold" id="_customPortraitSubmit" onclick="_submitCustomPortrait(this)">\u751F\u6210\u7ACB\u7ED8</button>' +
      '</div></div>';
    document.body.appendChild(ov);
    setTimeout(function() { var ta = document.getElementById('_customPortraitPrompt'); if (ta) ta.focus(); }, 100);
  }

  async function _submitCustomPortrait(btn) {
    var promptEl = document.getElementById('_customPortraitPrompt');
    if (!promptEl || !promptEl.value.trim()) { showToast('\u8BF7\u8F93\u5165\u63CF\u8FF0'); return; }
    var userPrompt = promptEl.value.trim();
    var dynasty = scriptData.dynasty || scriptData.era || '';
    var name = (document.getElementById('charName') || {}).value || '';

    // 禁用按钮，显示进度
    btn.disabled = true;
    btn.textContent = '\u751F\u6210\u4E2D\u2026';

    try {
      // 先让AI翻译为英文DALL-E prompt
      showToast('\u6B65\u9AA41: \u6784\u5EFA\u63CF\u8FF0\u2026');
      var translatePrompt = 'Convert the following user description into a detailed English DALL-E image generation prompt for a photorealistic portrait. Dynasty: ' + dynasty + '. Must look like a real person, NOT cartoon/anime. Output ONLY the English prompt.\n\nUser description: ' + userPrompt;
      var translated = await callAIEditor(translatePrompt, 500);
      var imagePrompt = translated.replace(/```/g, '').trim();

      // 生成图片
      showToast('\u6B65\u9AA42: \u751F\u6210\u56FE\u7247\u2026\uFF08\u7EA630\u79D2\uFF09');
      var imageDataUrl = await ImageAPI.generate(imagePrompt);

      // 写入立绘
      var dataInp = document.getElementById('charPortraitData');
      var prevImg = document.getElementById('charPortraitPreview');
      var emptyDiv = document.getElementById('charPortraitEmpty');
      if (dataInp) dataInp.value = imageDataUrl;
      if (prevImg) { prevImg.src = imageDataUrl; prevImg.style.display = 'block'; }
      if (emptyDiv) emptyDiv.style.display = 'none';

      showToast('\u2705 \u7ACB\u7ED8\u751F\u6210\u6210\u529F\uFF01');
      // 关闭弹窗
      var ov = btn.closest('div[style*="fixed"]');
      if (ov) ov.remove();
    } catch(e) {
      showToast('\u751F\u6210\u5931\u8D25: ' + e.message);
      btn.disabled = false;
      btn.textContent = '\u91CD\u8BD5';
    }
  }

  function renderFactions() {
    var list = document.getElementById('factionList');
    if (!list) return;
    list.innerHTML = '';
    scriptData.factions.forEach(function(f, i) {
      if (f && !f.description && f.desc) f.description = f.desc;
      var typeLabel = f.type || '未分类';
      var attClr = f.attitude === '友好' || f.attitude === '联盟' || f.attitude === '和亲' ? '#4a8a4a'
        : f.attitude === '敌对' || f.attitude === '敌视' ? '#8a3a3a'
        : f.attitude === '附属' || f.attitude === '宗主' || f.attitude === '名义从属' || f.attitude === '朝贡' ? '#3a5a8a' : '#555';
      var attBadge = f.attitude ? '<span style="display:inline-block;padding:0 5px;border-radius:8px;font-size:10px;background:' + attClr + ';color:#fff;margin-right:3px;">' + escHtml(f.attitude) + '</span>' : '';
      var facColor = f.color || '#666';
      var strNum = parseInt(f.strength) || 0;
      var strLabel = strNum <= 20 ? '衰弱' : strNum <= 40 ? '偏弱' : strNum <= 60 ? '中等' : strNum <= 80 ? '较强' : '强大';
      var milStr = f.militaryStrength ? ' 兵力~' + (f.militaryStrength >= 10000 ? Math.round(f.militaryStrength/10000) + '万' : f.militaryStrength) : '';
      var isPlayer = scriptData.playerInfo && scriptData.playerInfo.factionName === f.name;

      var h = '<div class="card" onclick="editFaction(' + i + ')" style="border-left:3px solid ' + facColor + ';' + (isPlayer ? 'border-right:2px solid var(--gold);' : '') + '">';
      if (isPlayer) h += '<span style="position:absolute;top:4px;left:8px;font-size:9px;background:var(--gold);color:#111;padding:0 4px;border-radius:3px;">玩家</span>';
      h += '<div class="card-title">' + escHtml(f.name) + '</div>';
      h += '<div class="card-meta"><span class="card-tag" style="background:' + facColor + '22;border:1px solid ' + facColor + ';color:' + facColor + ';">' + escHtml(typeLabel) + '</span> ' + attBadge + escHtml(f.leader || '');
      if (strNum) h += ' <span style="font-size:10px;color:var(--txt-d);">实力' + strNum + '(' + strLabel + ')' + milStr + '</span>';
      h += '</div>';
      // 深化标签：六维凝聚力平均 + 继承稳定性
      var _fTags = [];
      if (f.cohesion && typeof f.cohesion === 'object') {
        var _cohKeys = ['political','military','economic','cultural','ethnic','loyalty'];
        var _cohSum = 0, _cohN = 0;
        _cohKeys.forEach(function(k){ if (f.cohesion[k] != null) { _cohSum += f.cohesion[k]; _cohN++; } });
        if (_cohN > 0) _fTags.push('凝聚' + Math.round(_cohSum/_cohN));
      }
      if (f.succession && f.succession.stability != null) _fTags.push('继承稳' + f.succession.stability);
      if (f.militaryBreakdown) {
        var _mT = (f.militaryBreakdown.standingArmy||0) + (f.militaryBreakdown.militia||0) + (f.militaryBreakdown.elite||0);
        if (_mT > 0) _fTags.push('兵' + _mT);
      }
      if (Array.isArray(f.historicalEvents) && f.historicalEvents.length > 0) _fTags.push('大事' + f.historicalEvents.length);
      if (_fTags.length) h += '<div style="font-size:9px;color:var(--txt-d);margin:2px 0;">' + _fTags.map(function(t){return '<span style="background:rgba(74,154,184,0.12);padding:0 4px;border-radius:2px;margin-right:3px;">'+escHtml(t)+'</span>';}).join('') + '</div>';
      h += '<div class="card-desc">' + escHtml((f.description || f.desc || '暂无描述').substring(0, 80)) + '</div>';
      h += '<div style="position:absolute;top:8px;right:8px;"><button class="btn" style="padding:2px 8px;font-size:11px;" onclick="event.stopPropagation();deleteFaction(' + i + ')">删除</button></div>';
      h += '</div>';
      list.innerHTML += h;
    });
    updateBadge('factions', scriptData.factions.length);
  }

  function openFactionModal(index) {
    var isEdit = index !== undefined;
    var f = isEdit ? (scriptData.factions || [])[index]
      : {name:'', type:'core', leader:'', leaderTitle:'',
         description:'', territory:'', goal:'', strength:'',
         economy:50, playerRelation:0,
         attitude:'', resources:'', mainstream:'', culture:'',
         color:'#'+Math.floor((typeof random==='function'?random():Math.random())*16777215).toString(16).padStart(6,'0'),
         leaderInfo:{name:'',personality:'',age:'',gender:'',belief:'',learning:'',ethnicity:'',bio:''},
         heirInfo:{name:'',personality:'',age:'',gender:'',belief:'',learning:'',ethnicity:'',bio:''}};
    if (isEdit && !f) return;
    if (f && !f.description && f.desc) f.description = f.desc;

    function subForm(prefix, obj, label) {
      var o = obj || {};
      var h = '<div style="border:1px solid var(--border,#444);border-radius:6px;padding:8px;margin-top:4px">';
      h += '<div style="font-size:12px;color:#aaa;margin-bottom:6px">— ' + label + ' —</div>';
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
      h += '<div class="form-group" style="flex:1;min-width:100px"><label>姓名</label><input type="text" id="'+prefix+'_name" value="'+escHtml(o.name||'')+'"></div>';
      h += '<div class="form-group" style="flex:1;min-width:100px"><label>年龄</label><input type="text" id="'+prefix+'_age" value="'+escHtml(o.age||'')+'"></div>';
      h += '<div class="form-group" style="flex:1;min-width:80px"><label>性别</label><input type="text" id="'+prefix+'_gender" value="'+escHtml(o.gender||'')+'"></div></div>';
      h += '<div style="display:flex;gap:8px;flex-wrap:wrap">';
      h += '<div class="form-group" style="flex:1;min-width:100px"><label>性格</label><input type="text" id="'+prefix+'_personality" value="'+escHtml(o.personality||'')+'"></div>';
      h += '<div class="form-group" style="flex:1;min-width:100px"><label>信仰</label><input type="text" id="'+prefix+'_belief" value="'+escHtml(o.belief||'')+'"></div>';
      h += '<div class="form-group" style="flex:1;min-width:100px"><label>学识</label><input type="text" id="'+prefix+'_learning" value="'+escHtml(o.learning||'')+'"></div>';
      h += '<div class="form-group" style="flex:1;min-width:100px"><label>民族</label><input type="text" id="'+prefix+'_ethnicity" value="'+escHtml(o.ethnicity||'')+'"></div></div>';
      h += '<div class="form-group"><label>简介</label><textarea id="'+prefix+'_bio" rows="2">'+escHtml(o.bio||'')+'</textarea></div>';
      h += '</div>';
      return h;
    }

    var body = '';
    body += '<div class="form-group"><label>势力名称</label><input type="text" id="gm_name" value="'+escHtml(f.name||'')+'"></div>';
    body += '<div style="display:flex;gap:12px;">';
    // C3: type改为下拉
    body += '<div class="form-group" style="flex:1;"><label>势力类型</label><select id="gm_type" style="width:100%;">';
    ['主权国','藩镇','番属','部落','起义军','宗教势力','商贸势力','core','external'].forEach(function(t) {
      body += '<option value="'+t+'"'+(f.type===t?' selected':'')+'>'+t+'</option>';
    });
    body += '<option value=""' + (!f.type ? ' selected' : '') + '>自定义</option></select></div>';
    body += '<div class="form-group" style="flex:1;"><label>领土/范围</label><input type="text" id="gm_territory" value="'+escHtml(f.territory||'')+'"></div></div>';
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:1;"><label>首脑</label><input type="text" id="gm_leader" value="'+escHtml(f.leader||'')+'"></div>';
    body += '<div class="form-group" style="flex:1;"><label>首脑称号</label><input type="text" id="gm_leaderTitle" value="'+escHtml(f.leaderTitle||'')+'" placeholder="如：皇帝、可汗"></div></div>';
    body += '<div style="display:flex;gap:12px;">';
    // C1: strength改为数字+描述
    var strNum = parseInt(f.strength) || 0;
    var strLabel = strNum <= 20 ? '衰弱' : strNum <= 40 ? '偏弱' : strNum <= 60 ? '中等' : strNum <= 80 ? '较强' : '强大';
    body += '<div class="form-group" style="flex:1;"><label>实力 (1-100)</label><div style="display:flex;gap:6px;align-items:center;"><input type="number" id="gm_strength" min="1" max="100" value="'+(strNum||'')+'" placeholder="1-100" style="flex:1;" oninput="var l=this.value<=20?\'衰弱\':this.value<=40?\'偏弱\':this.value<=60?\'中等\':this.value<=80?\'较强\':\'强大\';document.getElementById(\'gm_str_label\').textContent=l"><span id="gm_str_label" style="font-size:11px;color:var(--txt-d);min-width:30px;">'+strLabel+'</span></div></div>';
    // C2: 军事力量字段
    body += '<div class="form-group" style="flex:1;"><label>兵力概估</label><input type="number" id="gm_militaryStrength" value="'+(f.militaryStrength||'')+'" placeholder="如：50000"></div></div>';
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:1;"><label>经济实力 (0-100)</label><input type="number" id="gm_economy" min="0" max="100" value="'+(f.economy||'')+'" placeholder="0-100"></div>';
    body += '<div class="form-group" style="flex:1;"><label>对玩家关系 (-100~100)</label><input type="number" id="gm_playerRelation" min="-100" max="100" value="'+(f.playerRelation||0)+'" placeholder="-100敌对 0中立 100友好"></div></div>';
    body += '<div style="display:flex;gap:12px;">';
    // 态度扩展选项
    body += '<div class="form-group" style="flex:1;"><label>对主角势力态度</label><select id="gm_attitude">';
    ['友好','中立','敌对','附属','宗主','名义从属','朝贡','联盟','和亲','互市','敌视'].forEach(function(s){
      body += '<option value="'+s+'"'+(f.attitude===s?' selected':'')+'>'+s+'</option>';
    });
    body += '</select></div>';
    // C4: 颜色选择器
    body += '<div class="form-group" style="flex:1;"><label>势力颜色</label><input type="color" id="gm_color" value="'+(f.color||'#666666')+'" style="width:100%;height:32px;cursor:pointer;"></div></div>';
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:1;"><label>主要资源</label><input type="text" id="gm_resources" value="'+escHtml(f.resources||'')+'"></div>';
    body += '<div class="form-group" style="flex:1;"><label>战略目标</label><input type="text" id="gm_goal" value="'+escHtml(f.goal||'')+'"></div></div>';
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:1;"><label>主流信仰</label><input type="text" id="gm_mainstream" value="'+escHtml(f.mainstream||'')+'" placeholder="如：儒家、佛教"></div>';
    body += '<div class="form-group" style="flex:1;"><label>主流文化</label><input type="text" id="gm_culture" value="'+escHtml(f.culture||'')+'" placeholder="如：汉文化、游牧文化"></div></div>';
body += '<div class="form-group"><label>简介</label><textarea id="gm_desc" rows="3">'+escHtml(f.description||f.desc||'')+'</textarea></div>';
    // C5: 领袖同步提示
    body += '<div style="font-size:11px;color:var(--txt-d);margin:-4px 0 8px;border-left:2px solid var(--gold-d);padding-left:8px;">保存后，首脑和储君信息将自动同步到角色列表。</div>';
    // E1: 显示属于此势力的角色
    var facName = f.name || '';
    if (facName) {
      var facChars = (scriptData.characters || []).filter(function(c) { return c.faction === facName; });
      if (facChars.length > 0) {
        body += '<div style="font-size:11px;color:var(--txt-d);margin-bottom:8px;background:var(--bg-2,#141425);padding:6px 8px;border-radius:4px;">属于此势力的角色(' + facChars.length + '): ' + facChars.map(function(c){return escHtml(c.name);}).join('、') + '</div>';
      }
    }
    body += subForm('ldr', f.leaderInfo, '首脑详情');
    body += subForm('heir', f.heirInfo, '储君详情');
    // ── 势力深化（六维凝聚力·军事结构·经济结构·继承） ──
    var coh = f.cohesion || {};
    body += '<details style="margin-top:12px;border:1px solid rgba(74,154,184,0.18);border-radius:6px;padding:8px;background:rgba(74,154,184,0.04);">';
    body += '<summary style="cursor:pointer;color:#4a9ab8;font-weight:700;font-size:12px;">势力深化（六维凝聚力·军事结构·经济结构·继承）</summary>';
    body += '<div style="font-size:10px;color:var(--txt-d);margin:6px 0;">六维凝聚力影响势力稳定性——低凝聚力易分裂/内乱</div>';
    body += '<div style="display:flex;gap:8px;flex-wrap:wrap;">';
    ['political','military','economic','cultural','ethnic','loyalty'].forEach(function(dim) {
      var labels = { political:'政治统一', military:'军事纪律', economic:'经济自给', cultural:'文化认同', ethnic:'民族同质', loyalty:'对政权忠诚' };
      body += '<div class="form-group" style="flex:1;min-width:120px;"><label>' + labels[dim] + ' (0-100)</label><input type="number" id="gm_coh_' + dim + '" min="0" max="100" value="' + (coh[dim]!=null?coh[dim]:60) + '"></div>';
    });
    body += '</div>';
    // 军事结构
    var mil = f.militaryBreakdown || {};
    body += '<div style="font-size:10px;color:var(--txt-d);margin:8px 0 4px;">军事结构（兵种分解）</div>';
    body += '<div style="display:flex;gap:8px;">';
    body += '<div class="form-group" style="flex:1;"><label>常备军</label><input type="number" id="gm_mil_standing" min="0" value="' + (mil.standingArmy||0) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>民兵</label><input type="number" id="gm_mil_militia" min="0" value="' + (mil.militia||0) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>精锐</label><input type="number" id="gm_mil_elite" min="0" value="' + (mil.elite||0) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>水师</label><input type="number" id="gm_mil_fleet" min="0" value="' + (mil.fleet||0) + '"></div></div>';
    // 经济结构
    var eco = f.economicStructure || {};
    body += '<div style="font-size:10px;color:var(--txt-d);margin:8px 0 4px;">经济结构（百分比，合计应约等于 100）</div>';
    body += '<div style="display:flex;gap:8px;">';
    body += '<div class="form-group" style="flex:1;"><label>农业%</label><input type="number" id="gm_eco_agriculture" min="0" max="100" value="' + (eco.agriculture||60) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>商贸%</label><input type="number" id="gm_eco_trade" min="0" max="100" value="' + (eco.trade||20) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>手工%</label><input type="number" id="gm_eco_handicraft" min="0" max="100" value="' + (eco.handicraft||15) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>贡赋%</label><input type="number" id="gm_eco_tribute" min="0" max="100" value="' + (eco.tribute||5) + '"></div></div>';
    // 继承
    var suc = f.succession || {};
    body += '<div style="font-size:10px;color:var(--txt-d);margin:8px 0 4px;">继承配置</div>';
    body += '<div style="display:flex;gap:8px;">';
    body += '<div class="form-group" style="flex:1;"><label>继承规则</label><select id="gm_suc_rule" style="width:100%;">';
    [['primogeniture','嫡长子继承'],['seniorityBrother','兄终弟及'],['electiveClan','推举制'],['abdication','禅让'],['strongest','以强为尊'],['custom','自定义']].forEach(function(r){ body += '<option value="'+r[0]+'"'+(suc.rule===r[0]?' selected':'')+'>'+r[1]+'</option>'; });
    body += '</select></div>';
    body += '<div class="form-group" style="flex:1;"><label>指定储君</label><input type="text" id="gm_suc_heir" value="' + escHtml(suc.designatedHeir||'') + '" placeholder="储君姓名"></div>';
    body += '<div class="form-group" style="flex:1;"><label>继承稳定性 (0-100)</label><input type="number" id="gm_suc_stability" min="0" max="100" value="' + (suc.stability!=null?suc.stability:60) + '" placeholder="低则易内乱"></div></div>';
    // 历史事件
    body += '<div class="form-group"><label>本势力历史大事（JSON）</label>';
    body += '<textarea id="gm_historicalEvents" rows="2" placeholder="如 [{&quot;turn&quot;:-10,&quot;event&quot;:&quot;安史之乱&quot;,&quot;impact&quot;:&quot;中央控制力下降&quot;}]">' + escHtml(JSON.stringify(f.historicalEvents||[])) + '</textarea></div>';
    // 势力内部党派
    body += '<div class="form-group"><label>势力内部党派（来自 parties 清单）</label>';
    body += '<input type="text" id="gm_internalParties" value="' + escHtml((f.internalParties||[]).join(',')) + '" placeholder="逗号分隔"></div>';
    body += '</details>';

    function upsertChar(info, role) {
      if (!info || !info.name) return;
      if (!scriptData.characters) scriptData.characters = [];
      var nm = info.name;
      var factionName = gv('gm_name');
      var idx = -1;
      for (var i = 0; i < scriptData.characters.length; i++) {
        var c = scriptData.characters[i];
        if (c.name === nm && c.faction === factionName) { idx = i; break; }
      }
      var obj = idx >= 0 ? scriptData.characters[idx] : {};
      obj.name        = nm;
      obj.type        = obj.type || 'main';
      obj.faction     = factionName;
      obj.role        = role;
      obj.personality = info.personality || obj.personality || '';
      obj.age         = info.age         || obj.age         || '';
      obj.gender      = info.gender      || obj.gender      || '';
      obj.belief      = info.belief      || obj.belief      || '';
      obj.learning    = info.learning    || obj.learning    || '';
      obj.ethnicity   = info.ethnicity   || obj.ethnicity   || '';
      obj.bio         = info.bio         || obj.bio         || '';
      if (idx >= 0) scriptData.characters[idx] = obj;
      else scriptData.characters.push(obj);
    }

    function readSubForm(prefix) {
      return {
        name:        gv(prefix+'_name'),
        age:         gv(prefix+'_age'),
        gender:      gv(prefix+'_gender'),
        personality: gv(prefix+'_personality'),
        belief:      gv(prefix+'_belief'),
        learning:    gv(prefix+'_learning'),
        ethnicity:   gv(prefix+'_ethnicity'),
        bio:         gv(prefix+'_bio')
      };
    }

    openGenericModal(isEdit ? '编辑势力' : '添加势力', body, function() {
      var ldrInfo  = readSubForm('ldr');
      var heirInfo = readSubForm('heir');
      var data = _cloneJson(f) || {};
      var _dataPatch = {
        id:          isEdit && f.id ? f.id : 'faction_' + Date.now(),
        name:        gv('gm_name'),
        type:        gv('gm_type'),
        leader:      gv('gm_leader'),
        leaderTitle: gv('gm_leaderTitle'),
        territory:   gv('gm_territory'),
        goal:        gv('gm_goal'),
        description: gv('gm_desc'),
        strength:    parseInt(gv('gm_strength')) || 50,
        militaryStrength: parseInt(gv('gm_militaryStrength')) || 0,
        economy:     parseInt(gv('gm_economy')) || 50,
        playerRelation: parseInt(gv('gm_playerRelation')) || 0,
        attitude:    gv('gm_attitude'),
        resources:   gv('gm_resources'),
        mainstream:  gv('gm_mainstream'),
        culture:     gv('gm_culture'),
        leaderInfo:  ldrInfo,
        heirInfo:    heirInfo,
        color: gv('gm_color') || ((isEdit && f.color) ? f.color : '#' + Math.floor((typeof random === 'function' ? random() : Math.random()) * 16777215).toString(16).padStart(6, '0')),
        cohesion: {
          political: parseInt(gv('gm_coh_political')) || 60,
          military: parseInt(gv('gm_coh_military')) || 60,
          economic: parseInt(gv('gm_coh_economic')) || 60,
          cultural: parseInt(gv('gm_coh_cultural')) || 60,
          ethnic: parseInt(gv('gm_coh_ethnic')) || 60,
          loyalty: parseInt(gv('gm_coh_loyalty')) || 60
        },
        militaryBreakdown: {
          standingArmy: parseInt(gv('gm_mil_standing')) || 0,
          militia: parseInt(gv('gm_mil_militia')) || 0,
          elite: parseInt(gv('gm_mil_elite')) || 0,
          fleet: parseInt(gv('gm_mil_fleet')) || 0
        },
        economicStructure: {
          agriculture: parseInt(gv('gm_eco_agriculture')) || 60,
          trade: parseInt(gv('gm_eco_trade')) || 20,
          handicraft: parseInt(gv('gm_eco_handicraft')) || 15,
          tribute: parseInt(gv('gm_eco_tribute')) || 5
        },
        succession: {
          rule: gv('gm_suc_rule') || 'primogeniture',
          designatedHeir: gv('gm_suc_heir') || '',
          stability: parseInt(gv('gm_suc_stability')) || 60
        },
        internalParties: gv('gm_internalParties') ? gv('gm_internalParties').split(/[,，]/).map(function(s){return s.trim();}).filter(Boolean) : []
      };
      var _prevLeaderInfo = _cloneJson(data.leaderInfo) || {};
      var _prevHeirInfo = _cloneJson(data.heirInfo) || {};
      Object.assign(data, _dataPatch);
      Object.keys(ldrInfo).forEach(function(key) { _prevLeaderInfo[key] = ldrInfo[key]; });
      Object.keys(heirInfo).forEach(function(key) { _prevHeirInfo[key] = heirInfo[key]; });
      data.leaderInfo = _prevLeaderInfo;
      data.heirInfo = _prevHeirInfo;
      data.desc = data.description;
      try { var _hev = JSON.parse(gv('gm_historicalEvents')); if (Array.isArray(_hev)) data.historicalEvents = _hev; else data.historicalEvents = []; } catch(e) { showToast('historicalEvents JSON 格式有误'); return; }
      // 保留已有的得罪阈值
      if (isEdit && f.offendThresholds) data.offendThresholds = f.offendThresholds;
      if (!data.name) { showToast('请输入名称'); return; }
      if (!scriptData.factions) scriptData.factions = [];
      if (isEdit) { scriptData.factions[index] = data; } else { scriptData.factions.push(data); }
      upsertChar(ldrInfo,  '首脑');
      upsertChar(heirInfo, '储君');
      closeGenericModal();
      renderFactions();
      renderCharacters();
      autoSave();
      showToast(isEdit ? '已更新' : '已添加');
    });
  }
  function editFaction(i) { openFactionModal(i); }

  function deleteFaction(i) {
    if (typeof EditHistory !== 'undefined') EditHistory.push('\u5220\u9664\u52BF\u529B ' + ((scriptData.factions[i]||{}).name||i));
    var deleted = scriptData.factions[i];
    var dName = deleted ? deleted.name : '';
    scriptData.factions.splice(i, 1);
    // 级联清理
    if (dName) {
      // 角色faction
      if (scriptData.characters) scriptData.characters.forEach(function(c){if(c.faction===dName)c.faction='';});
      // 事件linkedFactions
      ['historical','random','conditional','story','chain'].forEach(function(k) {
        if (scriptData.events && scriptData.events[k]) {
          scriptData.events[k].forEach(function(e) {
            if (e.linkedFactions && Array.isArray(e.linkedFactions)) e.linkedFactions = e.linkedFactions.filter(function(f){return f!==dName;});
          });
        }
      });
      // 封臣关系
      if (scriptData.vassalSystem && scriptData.vassalSystem.vassalRelations) {
        scriptData.vassalSystem.vassalRelations = scriptData.vassalSystem.vassalRelations.filter(function(r){return r.vassal!==dName && r.liege!==dName;});
      }
      // 势力关系矩阵
      if (scriptData.factionRelations) {
        scriptData.factionRelations = scriptData.factionRelations.filter(function(r){return r.from!==dName && r.to!==dName;});
      }
    }
    renderFactions();
    autoSave();
    showToast('已删除');
  }

  function renderSimpleList(
    listId, arr, fields, onEdit, onDel
  ) {
    var el = document.getElementById(listId);
    if (!el) return;
    el.innerHTML = '';
    if (!arr) arr = [];
    arr.forEach(function(item, i) {
      var meta = fields[1]
        ? '<div class="card-meta">'
          + escHtml(item[fields[1]] || '') + '</div>'
        : '';
      var desc = fields[2]
        ? '<div class="card-desc">'
          + escHtml(item[fields[2]] || '') + '</div>'
        : '';
      var h = '<div class="card" onclick="'
        + onEdit + '(' + i + ')">';
      h += '<div class="card-title">'
        + escHtml(item[fields[0]] || '未命名') + '</div>';
      h += meta + desc;
      h += '<div style="position:absolute;'
        + 'top:8px;right:8px;">';
      h += '<button class="btn" style="padding:2px 8px;'
        + 'font-size:11px;" onclick="event.stopPropagation();'
        + onDel + '(' + i + ')">删除</button></div>';
      h += '</div>';
      el.innerHTML += h;
    });
  }

  function renderClasses() {
    var list = document.getElementById('classList');
    if (!list) return;
    list.innerHTML = '';
    (scriptData.classes || []).forEach(function(c, i) {
      var inf = parseInt(c.influence || c.classInfluence) || 0;
      var sat = parseInt(c.satisfaction) || 0;
      var mobClr = c.mobility === '\u9AD8' ? '#4a8a4a' : c.mobility === '\u4E2D' ? '#b8860b' : '#8a3a3a';
      var h = '<div class="card" onclick="editClass(' + i + ')">';
      h += '<div class="card-title">' + escHtml(c.name || '未命名') + '</div>';
      h += '<div class="card-meta">';
      if (c.mobility) h += '<span style="display:inline-block;padding:0 5px;border-radius:8px;font-size:10px;background:' + mobClr + ';color:#fff;margin-right:4px;">流动' + escHtml(c.mobility) + '</span>';
      if (c.size) h += escHtml(c.size);
      if (c.status) h += ' · ' + escHtml(c.status);
      h += '</div>';
      // 双进度条：满意度+影响力
      if (inf > 0 || sat > 0) {
        h += '<div style="margin:4px 0;display:flex;gap:8px;">';
        if (inf > 0) h += '<div style="flex:1;"><div style="height:4px;background:var(--bg-3,#222);border-radius:2px;"><div style="height:100%;width:' + inf + '%;background:var(--blue,#4a7ab8);border-radius:2px;"></div></div><div style="font-size:9px;color:var(--txt-d);">影响' + inf + '</div></div>';
        if (sat > 0) h += '<div style="flex:1;"><div style="height:4px;background:var(--bg-3,#222);border-radius:2px;"><div style="height:100%;width:' + sat + '%;background:' + (sat > 60 ? 'var(--green,#4a4)' : sat > 30 ? 'var(--gold,#b80)' : 'var(--red,#a44)') + ';border-radius:2px;"></div></div><div style="font-size:9px;color:var(--txt-d);">满意' + sat + '</div></div>';
        h += '</div>';
      }
      if (c.economicRole) h += '<span style="display:inline-block;padding:0 4px;border-radius:3px;font-size:9px;background:var(--bg-3,#222);color:var(--txt-d);margin-right:4px;">' + escHtml(c.economicRole) + '</span>';
      if (c.demands) h += '<div style="font-size:10px;color:var(--gold);margin:2px 0;">诉求: ' + escHtml(c.demands).substring(0, 30) + '</div>';
      // 深化标签
      var _cTags = [];
      if (Array.isArray(c.leaders) && c.leaders.length > 0) _cTags.push('领袖:' + c.leaders.slice(0,2).join('/'));
      if (Array.isArray(c.representativeNpcs) && c.representativeNpcs.length > 0) _cTags.push('代表' + c.representativeNpcs.length + '人');
      if (Array.isArray(c.regionalVariants) && c.regionalVariants.length > 0) _cTags.push('地域' + c.regionalVariants.length);
      if (Array.isArray(c.internalFaction) && c.internalFaction.length > 0) _cTags.push('分化:' + c.internalFaction.map(function(i){return i.name;}).slice(0,2).join('/'));
      if (c.unrestLevels && c.unrestLevels.revolt != null && c.unrestLevels.revolt < 30) _cTags.push('⚠临起义');
      if (_cTags.length) h += '<div style="font-size:9px;color:var(--txt-d);margin:2px 0;">' + _cTags.map(function(t){return '<span style="background:rgba(184,140,60,0.12);padding:0 4px;border-radius:2px;margin-right:3px;">'+escHtml(t)+'</span>';}).join('') + '</div>';
      h += '<div class="card-desc">' + escHtml((c.description || '暂无描述').substring(0, 60)) + '</div>';
      h += '<div style="position:absolute;top:8px;right:8px;"><button class="btn" style="padding:2px 8px;font-size:11px;" onclick="event.stopPropagation();deleteClass(' + i + ')">删除</button></div>';
      h += '</div>';
      list.innerHTML += h;
    });
    updateBadge('classes', (scriptData.classes || []).length);
  }

  function openClassModal(i) {
    var isEdit = i !== undefined;
    var c = isEdit ? scriptData.classes[i]
      : {name:'', description:'',
         mobility:'', privileges:'', size:'', obligations:'', status:'', satisfaction:50, influence:50};
    // 兼容旧数据
    if (c.classInfluence !== undefined && c.influence === undefined) { c.influence = parseInt(c.classInfluence) || 50; }
    if (typeof c.satisfaction === 'string' && isNaN(parseInt(c.satisfaction))) { c.satisfactionDesc = c.satisfaction; c.satisfaction = 50; }
    if (typeof c.influence === 'string') { c.influence = parseInt(c.influence) || 50; }
    var body = '';
    body += '<div class="form-group"><label>阶层名称</label><input type="text" id="gm_name" value="' + escHtml(c.name) + '"></div>';
    body += '<div style="display:flex;gap:16px;">';
    body += '<div class="form-group" style="flex:1;"><label>流动性</label><select id="gm_mobility" style="width:100%;">';
    ['\u4F4E','\u4E2D','\u9AD8'].forEach(function(m) { body += '<option value="' + m + '"' + (c.mobility === m ? ' selected' : '') + '>' + m + '</option>'; });
    body += '</select></div>';
    body += '<div class="form-group" style="flex:1;"><label>人口规模</label><input type="text" id="gm_size" value="' + escHtml(c.size||'') + '" placeholder="如：约10%人口"></div>';
    body += '<div class="form-group" style="flex:1;"><label>法律地位</label><input type="text" id="gm_status" value="' + escHtml(c.status||'') + '" placeholder="如：良民/贱籍"></div></div>';
    body += '<div class="form-group"><label>特权</label><input type="text" id="gm_privileges" value="' + escHtml(c.privileges || '') + '" placeholder="如：免徭役、可任官"></div>';
    body += '<div class="form-group"><label>义务/负担</label><input type="text" id="gm_obligations" value="' + escHtml(c.obligations||'') + '" placeholder="如：服兵役、纳税"></div>';
    // A2: 经济角色/诉求/不满阈值
    body += '<div style="display:flex;gap:16px;">';
    body += '<div class="form-group" style="flex:1;"><label>经济角色</label><select id="gm_economicRole" style="width:100%;">';
    ['\u751F\u4EA7','\u5546\u8D38','\u519B\u4E8B','\u6CBB\u7406','\u5B97\u6559','\u624B\u5DE5','\u5176\u4ED6'].forEach(function(r) {
      body += '<option value="' + r + '"' + (c.economicRole === r ? ' selected' : '') + '>' + r + '</option>';
    });
    body += '</select></div>';
    body += '<div class="form-group" style="flex:1;"><label>不满阈值</label><input type="number" id="gm_unrestThreshold" min="0" max="100" value="' + (c.unrestThreshold || 30) + '" placeholder="满意度低于此值→动荡"></div></div>';
    body += '<div class="form-group"><label>当前诉求</label><textarea id="gm_demands" rows="2" placeholder="如：减轻赋税、放宽贸易管制、恢复土地">' + escHtml(c.demands||'') + '</textarea></div>';
    // B2: satisfaction和influence改为数字滑块
    body += '<div style="display:flex;gap:16px;">';
    body += '<div class="form-group" style="flex:1;"><label>阶层满意度 (0-100)</label><div style="display:flex;align-items:center;gap:8px;"><input type="range" min="0" max="100" value="' + (parseInt(c.satisfaction)||50) + '" id="gm_satisfaction" oninput="document.getElementById(\'gm_sat_val\').textContent=this.value" style="flex:1;"><span id="gm_sat_val" style="min-width:24px;text-align:center;font-size:12px;color:var(--gold);">' + (parseInt(c.satisfaction)||50) + '</span></div></div>';
    body += '<div class="form-group" style="flex:1;"><label>阶层影响力 (0-100)</label><div style="display:flex;align-items:center;gap:8px;"><input type="range" min="0" max="100" value="' + (parseInt(c.influence)||50) + '" id="gm_influence" oninput="document.getElementById(\'gm_inf_val\').textContent=this.value" style="flex:1;"><span id="gm_inf_val" style="min-width:24px;text-align:center;font-size:12px;color:var(--gold);">' + (parseInt(c.influence)||50) + '</span></div></div></div>';
    body += '<div class="form-group"><label>描述</label><textarea id="gm_desc" rows="3">' + escHtml(c.description || '') + '</textarea></div>';
    // ── 阶层深化（代表 NPC·领袖·地域变体·内部分化·分级不满·经济指标） ──
    var lvls = c.unrestLevels || {};
    var econInd = c.economicIndicators || {};
    body += '<details style="margin-top:12px;border:1px solid rgba(184,140,60,0.18);border-radius:6px;padding:8px;background:rgba(184,140,60,0.04);">';
    body += '<summary style="cursor:pointer;color:#b88c3c;font-weight:700;font-size:12px;">阶层深化（代表·领袖·地域分化·分级不满）</summary>';
    // 代表 NPC
    body += '<div class="form-group"><label>代表 NPC（从现有角色中选）</label>';
    body += '<input type="text" id="gm_representativeNpcs" value="' + escHtml((c.representativeNpcs||[]).join(',')) + '" placeholder="逗号分隔姓名，如：张三,李四"></div>';
    // 阶层领袖
    body += '<div class="form-group"><label>阶层领袖（可多人）</label>';
    body += '<input type="text" id="gm_leaders" value="' + escHtml((c.leaders||[]).join(',')) + '" placeholder="逗号分隔，可与代表 NPC 重叠"></div>';
    // 支持党派
    body += '<div class="form-group"><label>支持党派</label>';
    body += '<input type="text" id="gm_supportingParties" value="' + escHtml((c.supportingParties||[]).join(',')) + '" placeholder="逗号分隔，如：东林党,保守派"></div>';
    // 地域变体
    body += '<div class="form-group"><label>地域分化（JSON）</label>';
    body += '<textarea id="gm_regionalVariants" rows="2" placeholder="如 [{&quot;region&quot;:&quot;江南&quot;,&quot;satisfaction&quot;:70,&quot;distinguishing&quot;:&quot;富庶开放&quot;}]">' + escHtml(JSON.stringify(c.regionalVariants||[])) + '</textarea></div>';
    // 内部分化
    body += '<div class="form-group"><label>内部分化（如士绅→南党/北党）</label>';
    body += '<textarea id="gm_internalFaction" rows="2" placeholder="如 [{&quot;name&quot;:&quot;南党&quot;,&quot;size&quot;:&quot;60%&quot;,&quot;stance&quot;:&quot;主和&quot;}]">' + escHtml(JSON.stringify(c.internalFaction||[])) + '</textarea></div>';
    // 分级不满
    body += '<div style="font-size:10px;color:var(--txt-d);margin:8px 0 4px;">分级不满（0-100，越低越不满）</div>';
    body += '<div style="display:flex;gap:8px;">';
    body += '<div class="form-group" style="flex:1;"><label>抱怨水平</label><input type="number" id="gm_lv_grievance" min="0" max="100" value="' + (lvls.grievance!=null?lvls.grievance:60) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>请愿水平</label><input type="number" id="gm_lv_petition" min="0" max="100" value="' + (lvls.petition!=null?lvls.petition:70) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>罢工罢市</label><input type="number" id="gm_lv_strike" min="0" max="100" value="' + (lvls.strike!=null?lvls.strike:80) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>起义水平</label><input type="number" id="gm_lv_revolt" min="0" max="100" value="' + (lvls.revolt!=null?lvls.revolt:90) + '"></div></div>';
    // 经济指标
    body += '<div style="font-size:10px;color:var(--txt-d);margin:8px 0 4px;">经济指标</div>';
    body += '<div style="display:flex;gap:8px;">';
    body += '<div class="form-group" style="flex:1;"><label>财富水平 (0-100)</label><input type="number" id="gm_ei_wealth" min="0" max="100" value="' + (econInd.wealth!=null?econInd.wealth:50) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>税负承受 (0-100)</label><input type="number" id="gm_ei_taxBurden" min="0" max="100" value="' + (econInd.taxBurden!=null?econInd.taxBurden:50) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>土地占有 (0-100)</label><input type="number" id="gm_ei_landHolding" min="0" max="100" value="' + (econInd.landHolding!=null?econInd.landHolding:30) + '"></div></div>';
    body += '</details>';
    // C1: 得罪机制可视化编辑
    body += '<div style="margin-top:12px;padding:10px;background:rgba(192,57,43,0.06);border:1px solid rgba(192,57,43,0.15);border-radius:6px;">';
    body += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
    body += '<div style="font-size:12px;color:#c0392b;font-weight:700;">得罪机制（可选）</div>';
    body += '<button type="button" onclick="addOffendThreshold()" style="font-size:10px;padding:1px 8px;background:none;border:1px solid rgba(192,57,43,0.3);color:#c0392b;border-radius:3px;cursor:pointer;">+ 添加阈值</button></div>';
    body += '<div id="offendThresholdsList">';
    (c.offendThresholds || []).forEach(function(t, ti) {
      body += _renderOffendThresholdRow(t, ti);
    });
    body += '</div>';
    body += '<input type="hidden" id="gm_offendThresholds" value="' + escHtml(JSON.stringify(c.offendThresholds||[])) + '">';
    body += '</div>';
    openGenericModal(
      isEdit ? '编辑阶层' : '添加阶层', body,
      function() {
        var d = {
          name: gv('gm_name'),
          mobility: gv('gm_mobility'),
          privileges: gv('gm_privileges'),
          description: gv('gm_desc'),
          size: gv('gm_size'),
          obligations: gv('gm_obligations'),
          status: gv('gm_status'),
          satisfaction: parseInt(gv('gm_satisfaction')) || 50,
          influence: parseInt(gv('gm_influence')) || 50,
          economicRole: gv('gm_economicRole'),
          unrestThreshold: parseInt(gv('gm_unrestThreshold')) || 30,
          demands: gv('gm_demands'),
          representativeNpcs: gv('gm_representativeNpcs') ? gv('gm_representativeNpcs').split(/[,，]/).map(function(s){return s.trim();}).filter(Boolean) : [],
          leaders: gv('gm_leaders') ? gv('gm_leaders').split(/[,，]/).map(function(s){return s.trim();}).filter(Boolean) : [],
          supportingParties: gv('gm_supportingParties') ? gv('gm_supportingParties').split(/[,，]/).map(function(s){return s.trim();}).filter(Boolean) : [],
          unrestLevels: {
            grievance: parseInt(gv('gm_lv_grievance')) || 60,
            petition: parseInt(gv('gm_lv_petition')) || 70,
            strike: parseInt(gv('gm_lv_strike')) || 80,
            revolt: parseInt(gv('gm_lv_revolt')) || 90
          },
          economicIndicators: {
            wealth: parseInt(gv('gm_ei_wealth')) || 50,
            taxBurden: parseInt(gv('gm_ei_taxBurden')) || 50,
            landHolding: parseInt(gv('gm_ei_landHolding')) || 30
          }
        };
        try { var _rv = JSON.parse(gv('gm_regionalVariants')); if (Array.isArray(_rv)) d.regionalVariants = _rv; } catch(e) { d.regionalVariants = []; }
        try { var _if = JSON.parse(gv('gm_internalFaction')); if (Array.isArray(_if)) d.internalFaction = _if; } catch(e) { d.internalFaction = []; }
        try { var _ot = JSON.parse(gv('gm_offendThresholds')); if (Array.isArray(_ot) && _ot.length > 0) d.offendThresholds = _ot; } catch(e) {}
        if (!d.name) {
          showToast('请输入名称'); return;
        }
        if (isEdit) scriptData.classes[i] = d;
        else scriptData.classes.push(d);
        closeGenericModal();
        renderClasses();
        autoSave();
        showToast(isEdit ? '已更新' : '已添加');
      }
    );
  }

  function editClass(i) { openClassModal(i); }

  function deleteClass(i) {
    scriptData.classes.splice(i, 1);
    renderClasses();
    autoSave();
  }

  function renderItems() {
    var list = document.getElementById('itemList');
    if (!list) return;
    list.innerHTML = '';
    var typeLabels = {weapon:'\u6B66\u5668',armor:'\u9632\u5177',consumable:'\u6D88\u8017',treasure:'\u73CD\u5B9D',document:'\u6587\u4E66',seal:'\u5370\u4FE1',special:'\u7279\u6B8A'};
    var typeColors = {weapon:'#8a3a3a',armor:'#3a5a8a',consumable:'#4a8a4a',treasure:'#b8860b',document:'#6a5a8a',seal:'#8a6a3a',special:'#666'};
    var rarityColors = {'\u666E\u901A':'#666','\u7CBE\u826F':'#4a8a4a','\u73CD\u8D35':'#3a5aaa','\u4F20\u8BF4':'#b8860b'};
    (scriptData.items || []).forEach(function(it, i) {
      var tLabel = typeLabels[it.type] || it.type || '\u672A\u5206\u7C7B';
      var tColor = typeColors[it.type] || '#666';
      var rColor = rarityColors[it.rarity] || '#666';
      var h = '<div class="card" onclick="editItem(' + i + ')">';
      h += '<div class="card-title">' + escHtml(it.name || '') + '</div>';
      h += '<div class="card-meta">';
      h += '<span style="display:inline-block;padding:0 5px;border-radius:8px;font-size:10px;background:' + tColor + ';color:#fff;margin-right:3px;">' + tLabel + '</span>';
      if (it.rarity && it.rarity !== '\u666E\u901A') h += '<span style="display:inline-block;padding:0 5px;border-radius:8px;font-size:10px;background:' + rColor + ';color:#fff;margin-right:3px;">' + escHtml(it.rarity) + '</span>';
      if (it.owner) h += '<span style="font-size:10px;color:var(--txt-d);">持有:' + escHtml(it.owner) + '</span>';
      h += '</div>';
      if (it.effect) h += '<div style="font-size:10px;color:var(--gold);margin:2px 0;">' + escHtml(it.effect).substring(0, 40) + '</div>';
      h += '<div class="card-desc">' + escHtml((it.description || '\u6682\u65E0').substring(0, 60)) + '</div>';
      h += '<div style="position:absolute;top:8px;right:8px;"><button class="btn" style="padding:2px 8px;font-size:11px;" onclick="event.stopPropagation();deleteItem(' + i + ')">\u5220\u9664</button></div>';
      h += '</div>';
      list.innerHTML += h;
    });
    updateBadge('items', (scriptData.items || []).length);
  }

  function openItemModal(i) {
    var isEdit = i !== undefined;
    var c = isEdit ? scriptData.items[i]
      : {name:'', type:'weapon', description:'', effect:'', rarity:'\u666E\u901A', owner:'', value:0};
    var body = '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:2;"><label>物品名称</label><input type="text" id="gm_name" value="' + escHtml(c.name) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>类型</label><select id="gm_type" style="width:100%;">';
    [['weapon','\u6B66\u5668'],['armor','\u9632\u5177'],['consumable','\u6D88\u8017\u54C1'],['treasure','\u73CD\u5B9D'],['document','\u6587\u4E66/\u5377\u8F74'],['seal','\u5370\u4FE1/\u4FE1\u7269'],['special','\u7279\u6B8A']].forEach(function(t) {
      body += '<option value="' + t[0] + '"' + (c.type === t[0] ? ' selected' : '') + '>' + t[1] + '</option>';
    });
    body += '</select></div>';
    body += '<div class="form-group" style="flex:1;"><label>稀有度</label><select id="gm_rarity" style="width:100%;">';
    ['\u666E\u901A','\u7CBE\u826F','\u73CD\u8D35','\u4F20\u8BF4'].forEach(function(r) {
      body += '<option value="' + r + '"' + (c.rarity === r ? ' selected' : '') + '>' + r + '</option>';
    });
    body += '</select></div></div>';
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:2;"><label>持有者</label><select id="gm_owner" style="width:100%;"><option value="">无主/待获取</option>';
    (scriptData.characters || []).forEach(function(ch) {
      if (ch.name) body += '<option value="' + escHtml(ch.name) + '"' + (c.owner === ch.name ? ' selected' : '') + '>' + escHtml(ch.name) + '</option>';
    });
    body += '</select></div>';
    body += '<div class="form-group" style="flex:1;"><label>价值</label><input type="number" id="gm_value" min="0" value="' + (c.value || 0) + '"></div></div>';
    var _varNames = (scriptData.variables && scriptData.variables.base ? scriptData.variables.base.map(function(v){return v.name;}) : []).concat(scriptData.variables && scriptData.variables.other ? scriptData.variables.other.map(function(v){return v.name;}) : []);
    body += '<div class="form-group"><label>效果</label><input type="text" id="gm_effect" value="' + escHtml(c.effect || '') + '" placeholder="如：持有者武勇+10，或：展示可提升威望">';
    if (_varNames.length > 0) body += '<div style="font-size:10px;color:var(--text-dim);margin-top:2px;">可用变量：' + _varNames.slice(0,8).join('、') + '</div>';
    body += '</div>';
    body += '<div class="form-group"><label>描述</label><textarea id="gm_desc" rows="3">' + escHtml(c.description || '') + '</textarea></div>';
    openGenericModal(
      isEdit ? '\u7F16\u8F91\u7269\u54C1' : '\u6DFB\u52A0\u7269\u54C1', body,
      function() {
        var d = {
          name: gv('gm_name'), type: gv('gm_type'),
          effect: gv('gm_effect'), description: gv('gm_desc'),
          rarity: gv('gm_rarity'), owner: gv('gm_owner'),
          value: parseInt(gv('gm_value')) || 0
        };
        if (!d.name) { showToast('\u8BF7\u8F93\u5165\u540D\u79F0'); return; }
        if (isEdit) scriptData.items[i] = d;
        else scriptData.items.push(d);
        closeGenericModal();
        renderItems();
        autoSave();
        showToast(isEdit ? '\u5DF2\u66F4\u65B0' : '\u5DF2\u6DFB\u52A0');
      }
    );
  }

  function editItem(i) { openItemModal(i); }

  function deleteItem(i) {
    scriptData.items.splice(i, 1);
    renderItems();
    autoSave();
  }

  // ============================================================
  // 势力关系矩阵
  // ============================================================

  function switchFacSub(sub, el) {
    document.querySelectorAll('#panel-factions .sub-tab').forEach(function(t) { t.classList.remove('active'); });
    if (el) el.classList.add('active');
    document.getElementById('facSubAll').style.display = sub === 'facAll' ? '' : 'none';
    document.getElementById('facSubRelations').style.display = sub === 'facRelations' ? '' : 'none';
    if (sub === 'facRelations') renderFactionRelationsMatrix();
  }

  function renderFactionRelationsMatrix() {
    var el = document.getElementById('factionRelationsMatrix');
    if (!el) return;
    if (!scriptData.factionRelations) scriptData.factionRelations = [];
    var rels = scriptData.factionRelations;
    var facNames = (scriptData.factions || []).map(function(f) { return f.name; });
    var pi = scriptData.playerInfo || {};
    if (pi.factionName && facNames.indexOf(pi.factionName) < 0) facNames.unshift(pi.factionName);

    if (facNames.length < 2) {
      el.innerHTML = '<div style="color:var(--txt-d);text-align:center;padding:2rem;">至少需要2个势力才能配置关系</div>';
      return;
    }

    var html = '';
    // 关系列表视图
    html += '<div style="font-size:12px;color:var(--txt-d);margin-bottom:8px;">共 ' + rels.length + ' 条关系 · 类型：联盟/友好/中立/敌视/交战/朝贡/宗藩/名义从属</div>';
    rels.forEach(function(r, i) {
      var valClr = (r.value || 0) > 30 ? 'var(--green,#4a4)' : (r.value || 0) < -30 ? 'var(--red,#a44)' : 'var(--txt-d)';
      html += '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;margin-bottom:4px;background:var(--bg-2,#141425);border-radius:6px;font-size:12px;">';
      html += '<select onchange="updateFacRel(' + i + ',\'from\',this.value)" style="flex:1;font-size:11px;">';
      facNames.forEach(function(n) { html += '<option value="' + escHtml(n) + '"' + (r.from === n ? ' selected' : '') + '>' + escHtml(n) + '</option>'; });
      html += '</select>';
      html += '<span style="color:var(--txt-d);">→</span>';
      html += '<select onchange="updateFacRel(' + i + ',\'to\',this.value)" style="flex:1;font-size:11px;">';
      facNames.forEach(function(n) { html += '<option value="' + escHtml(n) + '"' + (r.to === n ? ' selected' : '') + '>' + escHtml(n) + '</option>'; });
      html += '</select>';
      html += '<select onchange="updateFacRel(' + i + ',\'type\',this.value)" style="width:70px;font-size:11px;">';
      ['联盟','友好','中立','敌视','交战','朝贡','宗藩','名义从属'].forEach(function(t) {
        html += '<option value="' + t + '"' + (r.type === t ? ' selected' : '') + '>' + t + '</option>';
      });
      html += '</select>';
      html += '<input type="number" value="' + (r.value || 0) + '" min="-100" max="100" style="width:50px;font-size:11px;color:' + valClr + ';" onchange="updateFacRel(' + i + ',\'value\',parseInt(this.value)||0)">';
      html += '<input type="text" value="' + escHtml(r.desc || '') + '" placeholder="备注" style="flex:1;font-size:11px;" onchange="updateFacRel(' + i + ',\'desc\',this.value)">';
      html += '<button onclick="deleteFacRel(' + i + ')" style="font-size:10px;padding:1px 6px;background:#5a2020;color:#eee;border:none;border-radius:3px;cursor:pointer;">X</button>';
      html += '</div>';
    });

    el.innerHTML = html;
  }

  function updateFacRel(i, field, value) {
    if (!scriptData.factionRelations || !scriptData.factionRelations[i]) return;
    scriptData.factionRelations[i][field] = value;
    autoSave();
  }

  function deleteFacRel(i) {
    if (!scriptData.factionRelations) return;
    scriptData.factionRelations.splice(i, 1);
    renderFactionRelationsMatrix();
    autoSave();
  }

  function addFactionRelation() {
    if (!scriptData.factionRelations) scriptData.factionRelations = [];
    var facNames = (scriptData.factions || []).map(function(f) { return f.name; });
    var pi = scriptData.playerInfo || {};
    if (pi.factionName && facNames.indexOf(pi.factionName) < 0) facNames.unshift(pi.factionName);
    if (facNames.length < 2) { showToast('至少需要2个势力'); return; }
    scriptData.factionRelations.push({
      from: facNames[0] || '', to: facNames[1] || '',
      type: '中立', value: 0, desc: ''
    });
    renderFactionRelationsMatrix();
    autoSave();
  }

  // ============================================================
  // C1: 得罪阈值可视化编辑（党派/阶层通用）
  // ============================================================

  function _renderOffendThresholdRow(t, idx) {
    var h = '<div style="display:flex;gap:6px;align-items:center;margin-bottom:4px;font-size:11px;" id="ot_row_' + idx + '">';
    h += '<input type="number" value="' + (t.score||0) + '" min="0" max="100" style="width:50px;" placeholder="分数" onchange="syncOffendThresholds()">';
    h += '<input type="text" value="' + escHtml(t.description||'') + '" style="flex:1;" placeholder="描述(如:不满)" onchange="syncOffendThresholds()">';
    h += '<input type="text" value="' + escHtml((t.consequences||[]).join('\u3001')) + '" style="flex:1;" placeholder="后果(顿号分隔)" onchange="syncOffendThresholds()">';
    h += '<button type="button" onclick="removeOffendThreshold(' + idx + ')" style="font-size:10px;padding:0 4px;background:#5a2020;color:#eee;border:none;border-radius:2px;cursor:pointer;">X</button>';
    h += '</div>';
    return h;
  }

  function addOffendThreshold() {
    var list = document.getElementById('offendThresholdsList');
    if (!list) return;
    var rows = list.querySelectorAll('[id^="ot_row_"]');
    var idx = rows.length;
    var def = {score:(idx+1)*30, description:'', consequences:[]};
    list.insertAdjacentHTML('beforeend', _renderOffendThresholdRow(def, idx));
    syncOffendThresholds();
  }

  function removeOffendThreshold(idx) {
    var row = document.getElementById('ot_row_' + idx);
    if (row) row.remove();
    var list = document.getElementById('offendThresholdsList');
    if (list) {
      var rows = list.querySelectorAll('[id^="ot_row_"]');
      rows.forEach(function(r, i) { r.id = 'ot_row_' + i; });
    }
    syncOffendThresholds();
  }

  function syncOffendThresholds() {
    var list = document.getElementById('offendThresholdsList');
    var hidden = document.getElementById('gm_offendThresholds');
    if (!list || !hidden) return;
    var thresholds = [];
    list.querySelectorAll('[id^="ot_row_"]').forEach(function(row) {
      var inputs = row.querySelectorAll('input[type="number"],input[type="text"]');
      if (inputs.length >= 3) {
        var score = parseInt(inputs[0].value) || 0;
        var desc = inputs[1].value || '';
        var cons = inputs[2].value ? inputs[2].value.split(/[,\u3001\uFF0C]/).map(function(s){return s.trim();}).filter(Boolean) : [];
        if (score > 0 || desc) thresholds.push({score: score, description: desc, consequences: cons});
      }
    });
    hidden.value = JSON.stringify(thresholds);
  }
