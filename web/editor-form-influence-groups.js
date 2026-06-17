// ???????? (editor-form-influence-groups.js)
// ? editor-game-systems.js ??
function renderInfluenceGroupsList() {
  if (!scriptData.influenceGroups) scriptData.influenceGroups = [];
  var el = document.getElementById('influenceGroups-list');
  if (typeof updateBadge === 'function') updateBadge('influenceGroups', scriptData.influenceGroups.length);
  if (!el) return;
  var groups = scriptData.influenceGroups || [];
  if (groups.length === 0) {
    el.innerHTML = '<div style="color:var(--text-dim);text-align:center;padding:20px;">\u6682\u65e0\u5e72\u653f\u96c6\u56e2\uff0c\u70b9\u51fb\u4e0b\u65b9\u6dfb\u52a0\u3002</div>';
    return;
  }
  var html = '';
  groups.forEach(function(g, i) {
    var influence = g.initialInfluence !== undefined ? g.initialInfluence : (g.influence || 25);
    var cohesion = g.initialCohesion !== undefined ? g.initialCohesion : (g.cohesion || 50);
    html += '<div class="card" style="border-left:3px solid var(--gold);">';
    html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">';
    html += '<strong style="color:var(--gold-light);">' + escHtml(g.name || '\u672a\u547d\u540d\u96c6\u56e2') + '</strong>';
    html += '<span style="font-size:11px;color:var(--text-dim);">type: ' + escHtml(g.type || 'custom') + '</span>';
    html += '</div>';
    html += '<div style="font-size:12px;color:var(--text-secondary);line-height:1.6;margin-bottom:6px;">members: ' + escHtml((g.members || []).join(', ').slice(0, 100)) + '</div>';
    html += '<div style="font-size:12px;color:var(--text-dim);">leader: ' + escHtml(g.leader || '') + ' / influence ' + influence + ' / cohesion ' + cohesion + '</div>';
    html += '<div style="margin-top:8px;display:flex;gap:6px;">';
    html += '<button class="btn btn-small" onclick="editInfluenceGroup(' + i + ')">\u7f16\u8f91</button>';
    html += '<button class="btn btn-small btn-danger" onclick="deleteInfluenceGroup(' + i + ')">\u5220\u9664</button>';
    html += '</div></div>';
  });
  el.innerHTML = html;
}

function addInfluenceGroupEntry() {
  if (!scriptData.influenceGroups) scriptData.influenceGroups = [];
  scriptData.influenceGroups.push({
    name: '\u65b0\u5e72\u653f\u96c6\u56e2',
    type: 'waiqi',
    leader: '',
    members: [],
    keyOffices: [],
    initialInfluence: 25,
    initialCohesion: 50,
    candidateBy: 'script'
  });
  renderInfluenceGroupsList();
  editInfluenceGroup(scriptData.influenceGroups.length - 1);
}

function editInfluenceGroup(idx) {
  var g = scriptData.influenceGroups && scriptData.influenceGroups[idx];
  if (!g) return;
  var html = '<div class="form-group"><label>\u540d\u79f0</label><input id="ig-name" value="' + escHtml(g.name || '') + '"></div>';
  html += '<div class="form-group"><label>\u7c7b\u578b</label><select id="ig-type"><option value="eunuch"' + (g.type === 'eunuch' ? ' selected' : '') + '>\u5ba6\u5b98</option><option value="waiqi"' + (g.type === 'waiqi' ? ' selected' : '') + '>\u5916\u621a</option><option value="consort"' + (g.type === 'consort' ? ' selected' : '') + '>\u540e\u5bab</option><option value="custom"' + (g.type === 'custom' ? ' selected' : '') + '>\u81ea\u5b9a\u4e49</option></select></div>';
  html += '<div class="form-group"><label>\u9996\u9886</label><input id="ig-leader" value="' + escHtml(g.leader || '') + '"></div>';
  html += '<div class="form-group"><label>\u6210\u5458\uff08\u9017\u53f7\u6216\u6362\u884c\u5206\u9694\uff09</label><textarea id="ig-members" rows="3">' + escHtml((g.members || []).join(',')) + '</textarea></div>';
  html += '<div class="form-group"><label>\u5173\u952e\u5b98\u804c\uff08\u9017\u53f7\u6216\u6362\u884c\u5206\u9694\uff09</label><textarea id="ig-offices" rows="3">' + escHtml((g.keyOffices || []).join(',')) + '</textarea></div>';
  html += '<div style="display:flex;gap:8px;"><div class="form-group" style="flex:1;"><label>\u521d\u59cb\u5f71\u54cd</label><input id="ig-influence" type="number" min="0" max="100" value="' + (g.initialInfluence !== undefined ? g.initialInfluence : (g.influence || 25)) + '"></div><div class="form-group" style="flex:1;"><label>\u521d\u59cb\u51dd\u805a</label><input id="ig-cohesion" type="number" min="0" max="100" value="' + (g.initialCohesion !== undefined ? g.initialCohesion : (g.cohesion || 50)) + '"></div></div>';
  html += '<div class="form-group"><label>\u6765\u6e90</label><input id="ig-source" value="' + escHtml(g.candidateBy || 'script') + '"></div>';
  showGenericModal('\u7f16\u8f91\u5e72\u653f\u96c6\u56e2', html, function() {
    var _split = function(id) {
      var el = document.getElementById(id);
      return el ? el.value.split(/[\n,\uff0c\u3001]+/).map(function(v) { return v.trim(); }).filter(Boolean) : [];
    };
    g.name = (document.getElementById('ig-name') || {}).value || g.name;
    g.type = (document.getElementById('ig-type') || {}).value || g.type;
    g.leader = (document.getElementById('ig-leader') || {}).value || '';
    g.members = _split('ig-members');
    g.keyOffices = _split('ig-offices');
    g.initialInfluence = parseFloat((document.getElementById('ig-influence') || {}).value) || 25;
    g.initialCohesion = parseFloat((document.getElementById('ig-cohesion') || {}).value) || 50;
    g.candidateBy = ((document.getElementById('ig-source') || {}).value || 'script').trim() || 'script';
    renderInfluenceGroupsList();
    if (typeof autoSave === 'function') autoSave();
  });
}

function deleteInfluenceGroup(idx) {
  if (!scriptData.influenceGroups) return;
  scriptData.influenceGroups.splice(idx, 1);
  renderInfluenceGroupsList();
  if (typeof autoSave === 'function') autoSave();
}


