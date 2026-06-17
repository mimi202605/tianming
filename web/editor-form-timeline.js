// ?????? (editor-form-timeline.js)
// ? editor-game-systems.js ??
function renderTimeline() {
    ['past','future'].forEach(function(k) {
      var listId = k === 'past' ? 'tlPastList' : 'tlFutureList';
      var el = document.getElementById(listId);
      if (!el) return;
      el.innerHTML = '';
      (scriptData.timeline[k]||[]).forEach(function(t, i) {
        var impClr = t.importance === '关键' ? 'var(--red,#c44)' : t.importance === '重要' ? 'var(--gold)' : 'var(--txt-d)';
        var h = '<div class="card" onclick="editTL_' + k + '(' + i + ')">';
        h += '<div class="card-title">' + escHtml(t.name||t.event||'') + '</div>';
        h += '<div class="card-meta">';
        if (t.year||t.date) h += '<span style="color:var(--gold);">' + escHtml(t.year||t.date) + '</span> ';
        if (t.importance) h += '<span style="font-size:10px;color:' + impClr + ';">[' + t.importance + ']</span> ';
        if (t.linkedChars) h += '<span style="font-size:10px;color:var(--txt-d);">' + escHtml(t.linkedChars) + '</span>';
        h += '</div>';
        if (t.description) h += '<div class="card-desc">' + escHtml(t.description.substring(0,60)) + '</div>';
        if (k === 'future' && t.triggerCondition) h += '<div style="font-size:10px;color:var(--blue,#4a7ab8);">触发: ' + escHtml(t.triggerCondition.substring(0,30)) + '</div>';
        h += '<div style="position:absolute;top:8px;right:8px;"><button class="btn" style="padding:2px 8px;font-size:11px;" onclick="event.stopPropagation();deleteTL_' + k + '(' + i + ')">删除</button></div>';
        h += '</div>';
        el.innerHTML += h;
      });
    });
    updateBadge('timeline', (scriptData.timeline.past||[]).length + (scriptData.timeline.future||[]).length);
  }

  function _buildTimelineForm(t, isFuture) {
    var body = '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:2;"><label>事件名 *</label><input type="text" id="tl_name" value="' + escHtml(t.name||t.event||'') + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>时间/年份</label><input type="text" id="tl_year" value="' + escHtml(t.year||t.date||'') + '" placeholder="如:建安四年春"></div>';
    body += '<div class="form-group" style="flex:1;"><label>重要程度</label><select id="tl_importance" style="width:100%;">';
    ['普通','重要','关键'].forEach(function(imp) { body += '<option value="' + imp + '"' + (t.importance === imp ? ' selected' : '') + '>' + imp + '</option>'; });
    body += '</select></div></div>';
    body += '<div class="form-group"><label>描述</label><textarea id="tl_desc" rows="3">' + escHtml(t.description||'') + '</textarea></div>';
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:1;"><label>关联角色</label><input type="text" id="tl_chars" value="' + escHtml(t.linkedChars||'') + '" placeholder="逗号分隔角色名"></div>';
    body += '<div class="form-group" style="flex:1;"><label>关联势力</label><input type="text" id="tl_facs" value="' + escHtml(t.linkedFactions||'') + '" placeholder="逗号分隔势力名"></div></div>';
    if (isFuture) {
      body += '<div class="form-group"><label>触发条件（供AI参考）</label><input type="text" id="tl_trigger" value="' + escHtml(t.triggerCondition||'') + '" placeholder="如：当某势力实力>80 或 某角色死亡后"></div>';
    }
    return body;
  }

  function _collectTimelineForm(isFuture) {
    var d = {
      name: gv('tl_name'), year: gv('tl_year'), importance: gv('tl_importance'),
      description: gv('tl_desc'), linkedChars: gv('tl_chars'), linkedFactions: gv('tl_facs')
    };
    if (isFuture) d.triggerCondition = gv('tl_trigger');
    return d;
  }

  function addTimeline(k) {
    var isFuture = k === 'future';
    var body = _buildTimelineForm({}, isFuture);
    openGenericModal('添加' + (isFuture ? '未来事件' : '历史事件'), body, function() {
      var d = _collectTimelineForm(isFuture);
      d.type = k;
      if (!d.name) { showToast('请输入事件名'); return; }
      scriptData.timeline[k].push(d);
      closeGenericModal(); renderTimeline(); autoSave(); showToast('已添加');
    });
  }

  (function() {
    ['past','future'].forEach(function(k) {
      var isFuture = k === 'future';
      window['editTL_' + k] = function(i) {
        var c = scriptData.timeline[k][i];
        var body = _buildTimelineForm(c, isFuture);
        openGenericModal('编辑事件', body, function() {
          var d = _collectTimelineForm(isFuture);
          d.type = k;
          // 保留旧字段
          if (c.triggered) d.triggered = c.triggered;
          scriptData.timeline[k][i] = d;
          closeGenericModal(); renderTimeline(); autoSave();
        });
      };
      window['deleteTL_' + k] = function(i) {
        scriptData.timeline[k].splice(i, 1);
        renderTimeline(); autoSave();
      };
    });
  })();

// ============================================================
// 目标/胜负条件 编辑
// ============================================================


