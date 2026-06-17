// ============================================================
// 剧本编辑器 — 军事系统 (editor-military.js)
// 依赖: editor-core.js (scriptData, escHtml, autoSave, etc.)
// ============================================================

  function renderMilitary() {
    var keys = ['troops', 'facilities', 'organization', 'campaigns'];
    var ids = { troops: 'troopList', facilities: 'facilityList', organization: 'orgList', campaigns: 'campaignList' };
    var total = 0;
    for (var x = 0; x < keys.length; x++) {
      var k = keys[x];
      renderSimpleList(ids[k], scriptData.military[k], ['name','type','description'], 'editMilItem_' + k, 'deleteMilItem_' + k);
      total += scriptData.military[k].length;
    }
    updateBadge('military', total);
  }

  function renderMilitaryNew() {
    if (!scriptData.military.initialTroops) scriptData.military.initialTroops = [];
    if (!scriptData.military.militarySystem) scriptData.military.militarySystem = [];

    var troopsHTML = scriptData.military.initialTroops.map(function(t, i) {
      var sub = [];
      if (t.armyType) sub.push(t.armyType);
      if (t.garrison) sub.push('驻:' + t.garrison);
      var sol = t.soldiers || t.strength || t.size || 0;
      if (sol) sub.push('兵力:' + sol);
      if (t.commander) sub.push('帅:' + t.commander + (t.commanderTitle ? '(' + t.commanderTitle + ')' : ''));
      // 兵种摘要
      if (Array.isArray(t.composition) && t.composition.length > 0) {
        sub.push(t.composition.map(function(c) { return c.type + (c.count ? c.count : ''); }).join('/'));
      }
      if (t.equipmentCondition) sub.push('装备' + t.equipmentCondition);
      // 军饷摘要
      if (Array.isArray(t.salary) && t.salary.length > 0) {
        sub.push('饷:' + t.salary.map(function(s) { return (s.amount||0) + (s.unit||''); }).join('+'));
      }
      var statLine = '士气' + (t.morale||50) + ' 训练' + (t.training||50) + ' 忠诚' + (t.loyalty||50);
      return '<div style="border:1px solid var(--bg-4);border-radius:6px;margin-bottom:6px;overflow:hidden">' +
        '<div style="display:flex;align-items:center;gap:6px;padding:6px 8px;background:var(--bg-2)">' +
        '<strong style="flex:1">' + escHtml(t.name || '') + '</strong>' +
        '<span style="font-size:10px;color:var(--txt-d)">' + escHtml(statLine) + '</span>' +
        '<button class="bd bsm" onclick="editInitialTroop(' + i + ')">✎</button>' +
        '<button class="bd bsm" onclick="deleteInitialTroop(' + i + ')">✕</button>' +
        '</div>' +
        (sub.length ? '<div style="padding:2px 8px 4px;font-size:10px;color:var(--txt-d);">' + escHtml(sub.join(' | ')) + '</div>' : '') +
        '</div>';
    }).join('');
    var el = document.getElementById('initialTroopsList');
    if (el) el.innerHTML = troopsHTML;

    renderSimpleList('militarySystemList', scriptData.military.militarySystem, ['name', 'type', 'description'], 'editMilitarySystem', 'deleteMilitarySystem');
    var total = scriptData.military.initialTroops.length + scriptData.military.militarySystem.length;
    updateBadge('military', total);
  }

  // Legacy troops/facilities/organization/campaigns CRUD (kept for compatibility)
  function addMilItem(k) {
    var labels = {troops:'兵种',facilities:'设施',organization:'编制',campaigns:'战役'};
    var body = '<div class="form-group"><label>名称</label><input type="text" id="gm_name"></div>';
    body += '<div class="form-group"><label>类型</label><input type="text" id="gm_type"></div>';
    body += '<div class="form-group"><label>描述</label><textarea id="gm_desc" rows="3"></textarea></div>';
    openGenericModal('添加' + labels[k], body, function() {
      var d = {name:gv('gm_name'),type:gv('gm_type'),description:gv('gm_desc')};
      if (!d.name) {showToast('请输入名称');return;}
      scriptData.military[k].push(d);
      closeGenericModal(); renderMilitaryNew(); autoSave();
    });
  }
  (function() {
    ['troops','facilities','organization','campaigns'].forEach(function(k) {
      window['editMilItem_' + k] = function(i) {
        var c = scriptData.military[k][i];
        var body = '<div class="form-group"><label>名称</label><input type="text" id="gm_name" value="' + escHtml(c.name) + '"></div>';
        body += '<div class="form-group"><label>类型</label><input type="text" id="gm_type" value="' + escHtml(c.type||'') + '"></div>';
        body += '<div class="form-group"><label>描述</label><textarea id="gm_desc" rows="3">' + escHtml(c.description||'') + '</textarea></div>';
        openGenericModal('编辑', body, function() {
          scriptData.military[k][i] = {name:gv('gm_name'),type:gv('gm_type'),description:gv('gm_desc')};
          closeGenericModal(); renderMilitaryNew(); autoSave();
        });
      };
      window['deleteMilItem_' + k] = function(i) {
        scriptData.military[k].splice(i, 1); renderMilitaryNew(); autoSave();
      };
    });
  })();

  // ============================================================
  // 开局部队 CRUD（全面重构版）
  // ============================================================

  // 兵种组成行
  function _compRow(c, i) {
    return '<div style="display:flex;gap:6px;align-items:center;margin-bottom:3px;" id="comp_row_' + i + '">' +
      '<input type="text" value="' + escHtml(c.type||'') + '" placeholder="兵种名(如:重装步卒)" style="flex:2;font-size:12px;">' +
      '<input type="number" value="' + (c.count||0) + '" min="0" placeholder="人数" style="flex:1;font-size:12px;">' +
      '<button type="button" onclick="this.parentElement.remove()" style="font-size:10px;padding:0 4px;background:#5a2020;color:#eee;border:none;border-radius:2px;">X</button></div>';
  }
  function _addCompRow() {
    var list = document.getElementById('it_comp_list');
    if (!list) return;
    var idx = list.querySelectorAll('[id^="comp_row_"]').length;
    list.insertAdjacentHTML('beforeend', _compRow({type:'',count:0}, idx));
  }

  // 军饷行
  function _salaryRow(s, i) {
    return '<div style="display:flex;gap:6px;align-items:center;margin-bottom:3px;" id="sal_row_' + i + '">' +
      '<input type="text" value="' + escHtml(s.resource||'') + '" placeholder="资源名(如:钱)" style="flex:1;font-size:12px;">' +
      '<input type="number" value="' + (s.amount||0) + '" min="0" placeholder="数量" style="flex:1;font-size:12px;">' +
      '<input type="text" value="' + escHtml(s.unit||'') + '" placeholder="单位(如:贯)" style="width:50px;font-size:12px;">' +
      '<button type="button" onclick="this.parentElement.remove()" style="font-size:10px;padding:0 4px;background:#5a2020;color:#eee;border:none;border-radius:2px;">X</button></div>';
  }
  function _addSalaryRow() {
    var list = document.getElementById('it_salary_list');
    if (!list) return;
    var idx = list.querySelectorAll('[id^="sal_row_"]').length;
    list.insertAdjacentHTML('beforeend', _salaryRow({resource:'',amount:0,unit:''}, idx));
  }

  // 构建部队表单
  function _buildTroopForm(t) {
    var body = '';
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:2;"><label>部队名称 *</label><input type="text" id="it_name" value="' + escHtml(t.name||'') + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>部队类型</label><select id="it_armyType" style="width:100%;">';
    ['禁军','边军','藩镇军','地方守备','水师','乡勇/民兵','自定义'].forEach(function(at) {
      body += '<option value="' + at + '"' + (t.armyType === at ? ' selected' : '') + '>' + at + '</option>';
    });
    body += '</select></div></div>';
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:1;"><label>总兵力</label><input type="number" id="it_soldiers" min="0" value="' + (t.soldiers||t.strength||t.size||0) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>驻地</label><input type="text" id="it_garrison" value="' + escHtml(t.garrison||t.location||'') + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>兵员素质</label><select id="it_quality" style="width:100%;"><option value="精锐"' + (t.quality==='精锐'?' selected':'') + '>精锐</option><option value="普通"' + ((t.quality==='普通'||!t.quality)?' selected':'') + '>普通</option><option value="新兵"' + (t.quality==='新兵'?' selected':'') + '>新兵</option></select></div></div>';
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:1;"><label>士气 (0-100)</label><input type="number" id="it_morale" min="0" max="100" value="' + (t.morale||50) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>训练度 (0-100)</label><input type="number" id="it_training" min="0" max="100" value="' + (t.training||50) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>忠诚度 (0-100)</label><input type="number" id="it_loyalty" min="0" max="100" value="' + (t.loyalty||50) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>掌控度 (0-100)</label><input type="number" id="it_control" min="0" max="100" value="' + (t.control||100) + '"></div></div>';
    // 统帅
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:1;"><label>统帅</label><select id="it_commander" style="width:100%;"><option value="">未指定</option>';
    (scriptData.characters || []).forEach(function(c) {
      if (c.name) body += '<option value="' + escHtml(c.name) + '"' + (t.commander === c.name ? ' selected' : '') + '>' + escHtml(c.name) + (c.title ? '(' + escHtml(c.title) + ')' : '') + '</option>';
    });
    body += '</select></div>';
    body += '<div class="form-group" style="flex:1;"><label>统帅头衔</label><input type="text" id="it_commanderTitle" value="' + escHtml(t.commanderTitle||'') + '" placeholder="如：镇西大将军"></div></div>';
    body += '<div style="display:flex;gap:12px;">';
    body += '<div class="form-group" style="flex:1;"><label>民族成分</label><input type="text" id="it_ethnicity" value="' + escHtml(t.ethnicity||'') + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>活动状态</label><input type="text" id="it_activity" value="' + escHtml(t.activity||'') + '" placeholder="驻防、巡边、训练"></div>';
    body += '<div class="form-group" style="flex:1;"><label>装备状况</label><select id="it_equipCondition" style="width:100%;"><option value="优良"' + (t.equipmentCondition==='优良'?' selected':'') + '>优良</option><option value="一般"' + ((t.equipmentCondition==='一般'||!t.equipmentCondition)?' selected':'') + '>一般</option><option value="简陋"' + (t.equipmentCondition==='简陋'?' selected':'') + '>简陋</option><option value="严重不足"' + (t.equipmentCondition==='严重不足'?' selected':'') + '>严重不足</option></select></div></div>';
    // 装备管理（编辑模式才显示）
    if (t._editIndex !== undefined) {
      body += '<div style="margin:8px 0;padding:6px 8px;background:var(--bg-2,#141425);border-radius:4px;font-size:12px;">已配置 ' + ((t.equipment && t.equipment.length) || 0) + ' 种装备 <button type="button" class="bt bsm" onclick="event.preventDefault();openEquipmentModal(' + t._editIndex + ')">管理装备</button></div>';
    } else {
      body += '<div style="font-size:11px;color:var(--txt-d);margin:4px 0;">装备将在保存后管理</div>';
    }
    // 兵种组成
    body += '<div style="margin:10px 0 4px;font-size:13px;font-weight:700;color:var(--gold);">兵种组成</div>';
    body += '<div style="font-size:10px;color:var(--txt-d);margin-bottom:4px;">每行一个兵种（应根据剧本背景和地理科技状况设定）</div>';
    body += '<div id="it_comp_list">';
    var comp = Array.isArray(t.composition) ? t.composition : [];
    if (typeof t.composition === 'string' && t.composition) { comp = [{type:t.composition, count:0}]; }
    comp.forEach(function(c, ci) { body += _compRow(c, ci); });
    body += '</div>';
    body += '<button type="button" onclick="_addCompRow()" style="font-size:11px;padding:2px 8px;margin-bottom:8px;">+ 添加兵种</button>';
    // 年军饷
    body += '<div style="margin:10px 0 4px;font-size:13px;font-weight:700;color:var(--gold);">年军饷</div>';
    body += '<div style="font-size:10px;color:var(--txt-d);margin-bottom:4px;">资源名和单位应与剧本变量中定义的一致</div>';
    body += '<div id="it_salary_list">';
    var sal = Array.isArray(t.salary) ? t.salary : [];
    if (typeof t.salary === 'string' && t.salary) { sal = [{resource:t.salary,amount:0,unit:''}]; }
    sal.forEach(function(s, si) { body += _salaryRow(s, si); });
    body += '</div>';
    body += '<button type="button" onclick="_addSalaryRow()" style="font-size:11px;padding:2px 8px;margin-bottom:8px;">+ 添加资源项</button>';
    body += '<div class="form-group"><label>部队描述</label><textarea id="it_desc" rows="2">' + escHtml(t.description||'') + '</textarea></div>';
    return body;
  }

  // 收集表单
  function _collectTroopForm(oldEquip) {
    var comp = [];
    document.querySelectorAll('[id^="comp_row_"]').forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      if (inputs.length >= 2 && inputs[0].value.trim()) comp.push({type:inputs[0].value.trim(), count:parseInt(inputs[1].value)||0});
    });
    var sal = [];
    document.querySelectorAll('[id^="sal_row_"]').forEach(function(row) {
      var inputs = row.querySelectorAll('input');
      if (inputs.length >= 3 && (inputs[0].value.trim() || inputs[1].value)) sal.push({resource:inputs[0].value.trim(), amount:parseInt(inputs[1].value)||0, unit:inputs[2].value.trim()});
    });
    return {
      name: gv('it_name').trim(), armyType: gv('it_armyType'),
      soldiers: parseInt(gv('it_soldiers'))||0, garrison: gv('it_garrison'), quality: gv('it_quality'),
      morale: parseInt(gv('it_morale'))||50, training: parseInt(gv('it_training'))||50,
      loyalty: parseInt(gv('it_loyalty'))||50, control: parseInt(gv('it_control'))||100,
      commander: gv('it_commander'), commanderTitle: gv('it_commanderTitle'),
      ethnicity: gv('it_ethnicity'), activity: gv('it_activity'),
      equipmentCondition: gv('it_equipCondition'),
      composition: comp, salary: sal, equipment: oldEquip || [],
      description: gv('it_desc')
    };
  }

  function addInitialTroop() {
    var body = _buildTroopForm({});
    openGenericModal('添加开局部队', body, function() {
      var troop = _collectTroopForm([]);
      if (!troop.name) { showToast('请输入部队名称'); return; }
      if (!scriptData.military.initialTroops) scriptData.military.initialTroops = [];
      scriptData.military.initialTroops.push(troop);
      closeGenericModal(); renderMilitaryNew(); autoSave(); showToast('已添加');
    });
  }

  function editInitialTroop(i) {
    var t = scriptData.military.initialTroops[i];
    if (!t) return;
    t._editIndex = i;
    var body = _buildTroopForm(t);
    delete t._editIndex;
    openGenericModal('编辑开局部队', body, function() {
      var troop = _collectTroopForm(t.equipment || []);
      if (!troop.name) { showToast('请输入部队名称'); return; }
      scriptData.military.initialTroops[i] = troop;
      closeGenericModal(); renderMilitaryNew(); autoSave(); showToast('已更新');
    });
  }

  function deleteInitialTroop(i) {
    if (!scriptData.military.initialTroops) return;
    scriptData.military.initialTroops.splice(i, 1);
    renderMilitaryNew(); autoSave(); showToast('已删除');
  }

  // ============================================================
  // 军制 CRUD
  // ============================================================
  function addMilitarySystem() {
    var body = '<div class="form-group"><label>军制名称 *</label><input type="text" id="ms_name"></div>';
    body += '<div style="display:flex;gap:16px;">';
    body += '<div class="form-group" style="flex:1;"><label>类型</label><input type="text" id="ms_type" placeholder="如：府兵制、募兵制"></div>';
    body += '<div class="form-group" style="flex:1;"><label>时代背景</label><input type="text" id="ms_era" placeholder="如：唐朝前期"></div></div>';
    body += '<div class="form-group"><label>描述</label><textarea id="ms_desc" rows="3"></textarea></div>';
    body += '<div class="form-group"><label>效果</label><textarea id="ms_effects" rows="2" placeholder="对军队的影响"></textarea></div>';
    openGenericModal('添加军制', body, function() {
      var name = gv('ms_name').trim();
      if (!name) { showToast('请输入名称'); return; }
      if (!scriptData.military.militarySystem) scriptData.military.militarySystem = [];
      scriptData.military.militarySystem.push({name:name,type:gv('ms_type'),era:gv('ms_era'),description:gv('ms_desc'),effects:gv('ms_effects')});
      closeGenericModal(); renderMilitaryNew(); autoSave(); showToast('已添加');
    });
  }
  function editMilitarySystem(i) {
    var s = scriptData.military.militarySystem[i]; if (!s) return;
    var body = '<div class="form-group"><label>军制名称 *</label><input type="text" id="ms_name" value="' + escHtml(s.name||'') + '"></div>';
    body += '<div style="display:flex;gap:16px;">';
    body += '<div class="form-group" style="flex:1;"><label>类型</label><input type="text" id="ms_type" value="' + escHtml(s.type||'') + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>时代背景</label><input type="text" id="ms_era" value="' + escHtml(s.era||'') + '"></div></div>';
    body += '<div class="form-group"><label>描述</label><textarea id="ms_desc" rows="3">' + escHtml(s.description||'') + '</textarea></div>';
    body += '<div class="form-group"><label>效果</label><textarea id="ms_effects" rows="2">' + escHtml(s.effects||'') + '</textarea></div>';
    openGenericModal('编辑军制', body, function() {
      var name = gv('ms_name').trim();
      if (!name) { showToast('请输入名称'); return; }
      scriptData.military.militarySystem[i] = {name:name,type:gv('ms_type'),era:gv('ms_era'),description:gv('ms_desc'),effects:gv('ms_effects')};
      closeGenericModal(); renderMilitaryNew(); autoSave(); showToast('已更新');
    });
  }
  function deleteMilitarySystem(i) {
    if (!scriptData.military.militarySystem) return;
    scriptData.military.militarySystem.splice(i, 1);
    renderMilitaryNew(); autoSave();
  }

  // ============================================================
  // 装备管理（简化版：name + count + condition）
  // ============================================================
  function openEquipmentModal(troopIndex) {
    var troop = scriptData.military.initialTroops[troopIndex];
    if (!troop) return;
    if (!troop.equipment) troop.equipment = [];

    var listHTML = troop.equipment.map(function(eq, ei) {
      return '<div style="border:1px solid var(--bg-4);border-radius:4px;padding:6px 8px;margin-bottom:4px;display:flex;align-items:center;gap:8px">' +
        '<strong style="flex:0 0 100px;color:var(--gold)">' + escHtml(eq.name||'') + '</strong>' +
        '<span style="flex:0 0 70px;font-size:11px;color:var(--txt-d)">数量:' + (eq.count||eq.actual||0) + '</span>' +
        '<span style="flex:1;font-size:11px;color:var(--txt-d)">' + (eq.condition||eq.note||'') + '</span>' +
        '<button class="bd bsm" onclick="editEquipment(' + troopIndex + ',' + ei + ')">✎</button>' +
        '<button class="bd bsm" onclick="deleteEquipment(' + troopIndex + ',' + ei + ')">✕</button>' +
        '</div>';
    }).join('');

    var body = '<div style="max-height:300px;overflow-y:auto;margin-bottom:12px">' +
      (listHTML || '<div style="color:var(--txt-d);font-size:12px;padding:8px">暂无装备（应根据剧本背景和科技水平配置）</div>') +
      '</div>' +
      '<button class="bt" onclick="addEquipment(' + troopIndex + ')">+ 添加装备</button>';
    openGenericModal('管理装备 - ' + troop.name, body, function() { renderMilitaryNew(); autoSave(); });
  }

  function addEquipment(troopIndex) {
    var troop = scriptData.military.initialTroops[troopIndex];
    if (!troop) return;
    if (!troop.equipment) troop.equipment = [];
    var body = '<div class="form-group"><label>装备名称 *</label><input type="text" id="eq_name" placeholder="如：明光铠、百炼横刀"></div>';
    body += '<div style="display:flex;gap:16px;">';
    body += '<div class="form-group" style="flex:1;"><label>数量</label><input type="number" id="eq_count" min="0" value="0"></div>';
    body += '<div class="form-group" style="flex:1;"><label>状况</label><select id="eq_condition"><option value="优良">优良</option><option value="一般" selected>一般</option><option value="缺损">缺损</option><option value="严重不足">严重不足</option></select></div>';
    body += '</div>';
    openGenericModal('添加装备', body, function() {
      var name = gv('eq_name').trim();
      if (!name) { showToast('请输入装备名称'); return; }
      troop.equipment.push({name:name, count:parseInt(gv('eq_count'))||0, condition:gv('eq_condition')});
      openEquipmentModal(troopIndex);
    });
  }

  function editEquipment(troopIndex, eqIndex) {
    var troop = scriptData.military.initialTroops[troopIndex];
    if (!troop || !troop.equipment) return;
    var eq = troop.equipment[eqIndex]; if (!eq) return;
    var body = '<div class="form-group"><label>装备名称 *</label><input type="text" id="eq_name" value="' + escHtml(eq.name||'') + '"></div>';
    body += '<div style="display:flex;gap:16px;">';
    body += '<div class="form-group" style="flex:1;"><label>数量</label><input type="number" id="eq_count" min="0" value="' + (eq.count||eq.actual||0) + '"></div>';
    body += '<div class="form-group" style="flex:1;"><label>状况</label><select id="eq_condition"><option value="优良"' + (eq.condition==='优良'?' selected':'') + '>优良</option><option value="一般"' + ((eq.condition==='一般'||!eq.condition)?' selected':'') + '>一般</option><option value="缺损"' + (eq.condition==='缺损'?' selected':'') + '>缺损</option><option value="严重不足"' + (eq.condition==='严重不足'?' selected':'') + '>严重不足</option></select></div>';
    body += '</div>';
    openGenericModal('编辑装备', body, function() {
      var name = gv('eq_name').trim();
      if (!name) { showToast('请输入装备名称'); return; }
      troop.equipment[eqIndex] = {name:name, count:parseInt(gv('eq_count'))||0, condition:gv('eq_condition')};
      openEquipmentModal(troopIndex);
    });
  }

  function deleteEquipment(troopIndex, eqIndex) {
    var troop = scriptData.military.initialTroops[troopIndex];
    if (!troop || !troop.equipment) return;
    troop.equipment.splice(eqIndex, 1);
    openEquipmentModal(troopIndex);
  }
