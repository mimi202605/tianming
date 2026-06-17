// ??????? (editor-form-edicts.js)
// ? editor-game-systems.js ??
function renderImperialEdictsList() {
  if (!scriptData.imperialEdicts) scriptData.imperialEdicts = [];
  var el = document.getElementById('imperialEdicts-list');
  if (!el) return;
  if (scriptData.imperialEdicts.length === 0) {
    el.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;">暂无初始皇命·点击下方添加</div>';
    return;
  }
  var html = '';
  scriptData.imperialEdicts.forEach(function(e, i) {
    var isSecret = (e.secret === true || e.secret === 'true');
    var border = isSecret ? '#a26be0' : 'var(--gold)';
    html += '<div class="card" style="border-left:3px solid ' + border + ';">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
    html += '<strong style="color:' + border + ';">' + (isSecret ? '🌟[天机] ' : '') + '[优先级 ' + (e.priority || 5) + '] ' + escHtml((e.content || '').slice(0, 40)) + (e.content && e.content.length > 40 ? '…' : '') + '</strong>';
    html += '</div>';
    html += '<div style="font-size:13px;color:var(--text-secondary);line-height:1.6;margin-bottom:8px;">' + escHtml(e.content || '') + '</div>';
    if (e.condition) html += '<div style="font-size:11px;color:var(--text-dim);">生效条件：' + escHtml(e.condition) + '</div>';
    if (isSecret) html += '<div style="font-size:11px;color:#a26be0;font-style:italic;">⚡ 此为隐藏天机·仅 sc1 主推演可见·NPC 心理与后人戏说不见</div>';
    html += '<div style="margin-top:8px;display:flex;gap:6px;">';
    html += '<button class="btn btn-small" onclick="editImperialEdictEntry(' + i + ')">编辑</button>';
    html += '<button class="btn btn-small btn-danger" onclick="deleteImperialEdictEntry(' + i + ')">删除</button>';
    html += '</div></div>';
  });
  el.innerHTML = html;
}

function addImperialEdictEntry() {
  if (!scriptData.imperialEdicts) scriptData.imperialEdicts = [];
  scriptData.imperialEdicts.push({
    priority: 5,
    content: '（在此输入皇命内容·如：祖训不可改）',
    condition: '永久生效',
    startTurn: 1
  });
  renderImperialEdictsList();
  editImperialEdictEntry(scriptData.imperialEdicts.length - 1);
}

function editImperialEdictEntry(idx) {
  var e = scriptData.imperialEdicts[idx];
  if (!e) return;
  var html = '<div class="form-group"><label>优先级（1-10·数值越大越优先）</label><input id="ie-pri" type="number" min="1" max="10" value="' + (e.priority || 5) + '"></div>';
  html += '<div class="form-group"><label>皇命内容（祖训/先帝遗诏/禁忌·或天机伏笔如"安史之乱将于第30回合爆发"）</label><textarea id="ie-content" rows="4">' + escHtml(e.content || '') + '</textarea></div>';
  html += '<div class="form-group"><label>生效条件（永久/至 T<n>/某事件后等·留空默认永久）</label><input id="ie-cond" value="' + escHtml(e.condition || '') + '"></div>';
  html += '<div class="form-group"><label>颁布回合</label><input id="ie-turn" type="number" min="1" value="' + (e.startTurn || 1) + '"></div>';
  html += '<div class="form-group"><label style="display:flex;align-items:center;gap:8px;"><input id="ie-secret" type="checkbox"' + (e.secret ? ' checked' : '') + '><span>🌟 隐藏天机（仅 sc1 主推演可见·NPC 心理 sc15/后人戏说 sc2 不见）</span></label><div style="font-size:11px;color:var(--text-dim);margin-top:4px;">用于"埋伏笔"——剧本作者预制的定时炸弹（如"安史之乱将于第30回合爆发""某权臣 5 年后将谋反"），AI 主推演会逐步引爆，但不会在 NPC 内心独白和后人戏说中提前剧透。</div></div>';
  showGenericModal('编辑初始皇命', html, function() {
    e.priority = parseInt(gv('ie-pri'), 10) || 5;
    e.content = gv('ie-content');
    e.condition = gv('ie-cond') || '永久生效';
    e.startTurn = parseInt(gv('ie-turn'), 10) || 1;
    var sec = document.getElementById('ie-secret');
    e.secret = !!(sec && sec.checked);
    renderImperialEdictsList();
    if (typeof autoSave === 'function') autoSave();
  });
}

function deleteImperialEdictEntry(idx) {
  if (!confirm('删除此条初始皇命？')) return;
  scriptData.imperialEdicts.splice(idx, 1);
  renderImperialEdictsList();
  if (typeof autoSave === 'function') autoSave();
}

// ============================================================
// 得罪群体 编辑
// ============================================================


