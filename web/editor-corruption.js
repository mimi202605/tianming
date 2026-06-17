// ═══════════════════════════════════════════════════════════════
// 编辑器 · 腐败初值配置面板
// 由 editor.html 的"吏治初值"侧栏项触发
// 数据写入 scriptData.corruption，覆盖朝代预设
// ═══════════════════════════════════════════════════════════════

function openCorruptionConfigEditor() {
  if (typeof scriptData === 'undefined') {
    alert('剧本数据未就绪');
    return;
  }
  if (!scriptData.corruption) scriptData.corruption = {};
  var cc = scriptData.corruption;
  var sd = cc.subDepts || {};
  var sv = cc.supervision || {};

  function numField(id, label, val, placeholder) {
    return '<div class="form-group" style="margin-bottom:6px;">'+
      '<label style="font-size:0.78rem;display:block;margin-bottom:2px;">' + label + '</label>'+
      '<input type="number" id="corrEd-' + id + '" min="0" max="100" '+
      'value="' + (val !== undefined && val !== null ? val : '') + '" '+
      'placeholder="' + (placeholder || '留空则按朝代预设') + '" '+
      'style="width:100%;padding:5px 8px;">'+
      '</div>';
  }

  var body = '';
  body += '<div style="margin-bottom:0.8rem;font-size:0.82rem;color:var(--txt-d);line-height:1.5;">'+
    '腐败初值配置。<b>所有字段可选</b>——未填字段将按剧本朝代 × 阶段自动预设。' +
    '填写的字段会覆盖预设。<br>' +
    '见 <code>设计方案-腐败系统.md §11</code> 的 12 朝代对照表。' +
    '</div>';

  // 左右两栏：左 = 主要数值，右 = 机构/集团 JSON
  body += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">';

  // 左栏：全局 + 6 部门
  body += '<div>';
  body += '<div class="panel-subtitle" style="font-size:0.82rem;color:var(--gold);margin-bottom:0.4rem;border-bottom:1px dashed #8b7355;padding-bottom:0.2rem;">主要数值（0-100）</div>';
  body += numField('trueIndex', '全局腐败指数', cc.trueIndex);
  body += '<div style="font-size:0.75rem;color:var(--gold);margin:0.5rem 0 0.2rem;">六部门分项</div>';
  body += numField('central',    '中央（京察）',    (sd.central||{}).true);
  body += numField('provincial', '地方（督抚/州县）', (sd.provincial||{}).true);
  body += numField('military',   '军队',           (sd.military||{}).true);
  body += numField('fiscal',     '税司（户部/盐铁）', (sd.fiscal||{}).true);
  body += numField('judicial',   '司法（刑部/提刑）', (sd.judicial||{}).true);
  body += numField('imperial',   '内廷（宗室/宦官）', (sd.imperial||{}).true);
  body += '<div style="font-size:0.75rem;color:var(--gold);margin:0.6rem 0 0.2rem;">监察力度</div>';
  body += numField('supLevel', '监察力度（0=蒙蔽, 100=洞察）', sv.level);
  body += '</div>';

  // 右栏：JSON 输入
  body += '<div>';
  body += '<div class="panel-subtitle" style="font-size:0.82rem;color:var(--gold);margin-bottom:0.4rem;border-bottom:1px dashed #8b7355;padding-bottom:0.2rem;">预设机构（JSON 数组）</div>';
  body += '<div style="font-size:0.7rem;color:var(--txt-d);margin-bottom:0.3rem;">字段：name / coverage / radius / independence / corruption / vacancies</div>';
  body += '<textarea id="corrEd-institutions" rows="6" style="width:100%;font-family:monospace;font-size:0.72rem;padding:6px;" placeholder=\'[{"name":"都察院","coverage":["central","provincial"],"radius":70,"independence":50,"corruption":20,"vacancies":0.15}]\'>'+
    JSON.stringify(sv.institutions || [], null, 2) + '</textarea>';

  body += '<div class="panel-subtitle" style="font-size:0.82rem;color:var(--gold);margin:0.7rem 0 0.4rem;border-bottom:1px dashed #8b7355;padding-bottom:0.2rem;">盘根错节集团（JSON 数组）</div>';
  body += '<div style="font-size:0.7rem;color:var(--txt-d);margin-bottom:0.3rem;">字段：name / dept / strength / years</div>';
  body += '<textarea id="corrEd-factions" rows="5" style="width:100%;font-family:monospace;font-size:0.72rem;padding:6px;" placeholder=\'[{"name":"严党","dept":"central","strength":75,"years":5}]\'>'+
    JSON.stringify(cc.entrenchedFactions || [], null, 2) + '</textarea>';
  body += '</div>';

  body += '</div>';  // grid end

  // 朝代预设参考
  body += '<details style="margin-top:0.8rem;background:var(--bg-2,#1a1a1a);padding:0.6rem;border-radius:4px;">'+
    '<summary style="cursor:pointer;font-size:0.82rem;color:var(--gold);">朝代预设参考表（12 朝 × 4 阶段）</summary>'+
    '<div style="font-size:0.72rem;color:var(--txt-s);margin-top:0.4rem;line-height:1.6;font-family:monospace;white-space:pre;">'+
    '朝代    开国  全盛  中衰  末世  部门偏重\n'+
    '秦       20    25    40    65   中央/军队\n'+
    '汉       15    30    50    80   内廷（外戚宦官）\n'+
    '魏晋     20    35    55    75   中央（门阀）\n'+
    '唐       20    30    55    85   内廷/地方（宦官+藩镇）\n'+
    '五代     50    55    65    85   军队\n'+
    '北宋     25    35    45    70   中央（冗官）\n'+
    '南宋     30    40    55    75   中央（权相）\n'+
    '元       40    50    70    85   地方/税司\n'+
    '明       15    25    60    85   内廷（阉党）\n'+
    '清       10    25    55    80   内廷/税司\n'+
    '上古      5    15    30    50   ——\n'+
    '民国     40    50    65    80   军队/地方'+
    '</div></details>';

  if (typeof openGenericModal !== 'function') {
    alert('openGenericModal 未就绪');
    return;
  }
  openGenericModal('吏治初值（腐败配置）', body, function() {
    // 保存：按字段写回 scriptData.corruption
    var cc2 = scriptData.corruption;

    function pickNum(id) {
      var el = document.getElementById('corrEd-' + id);
      if (!el) return undefined;
      var v = el.value.trim();
      if (v === '') return undefined;
      var n = Number(v);
      return isNaN(n) ? undefined : Math.max(0, Math.min(100, n));
    }

    var ti = pickNum('trueIndex');
    if (ti !== undefined) cc2.trueIndex = ti;
    else delete cc2.trueIndex;

    // 六部门
    if (!cc2.subDepts) cc2.subDepts = {};
    ['central','provincial','military','fiscal','judicial','imperial'].forEach(function(d) {
      var v = pickNum(d);
      if (v !== undefined) {
        if (!cc2.subDepts[d]) cc2.subDepts[d] = {};
        cc2.subDepts[d].true = v;
      } else if (cc2.subDepts[d]) {
        delete cc2.subDepts[d].true;
        if (Object.keys(cc2.subDepts[d]).length === 0) delete cc2.subDepts[d];
      }
    });
    if (Object.keys(cc2.subDepts).length === 0) delete cc2.subDepts;

    var sl = pickNum('supLevel');
    if (sl !== undefined) {
      if (!cc2.supervision) cc2.supervision = {};
      cc2.supervision.level = sl;
    } else if (cc2.supervision) {
      delete cc2.supervision.level;
    }

    // 机构 JSON
    var instEl = document.getElementById('corrEd-institutions');
    if (instEl) {
      var instText = instEl.value.trim();
      if (instText) {
        try {
          var parsed = JSON.parse(instText);
          if (Array.isArray(parsed) && parsed.length > 0) {
            if (!cc2.supervision) cc2.supervision = {};
            cc2.supervision.institutions = parsed;
          } else if (cc2.supervision) {
            delete cc2.supervision.institutions;
          }
        } catch(e) {
          alert('监察机构 JSON 解析失败：\n' + e.message);
          return false;  // 阻止关闭
        }
      } else if (cc2.supervision) {
        delete cc2.supervision.institutions;
      }
    }

    // 集团 JSON
    var facEl = document.getElementById('corrEd-factions');
    if (facEl) {
      var facText = facEl.value.trim();
      if (facText) {
        try {
          var parsed2 = JSON.parse(facText);
          if (Array.isArray(parsed2) && parsed2.length > 0) {
            cc2.entrenchedFactions = parsed2;
          } else {
            delete cc2.entrenchedFactions;
          }
        } catch(e) {
          alert('腐败集团 JSON 解析失败：\n' + e.message);
          return false;
        }
      } else {
        delete cc2.entrenchedFactions;
      }
    }

    // 清理：若 supervision 为空对象则移除
    if (cc2.supervision && Object.keys(cc2.supervision).length === 0) delete cc2.supervision;
    // 若 corruption 整体为空则移除
    if (Object.keys(cc2).length === 0) delete scriptData.corruption;

    if (typeof closeGenericModal === 'function') closeGenericModal();
    if (typeof toast === 'function') toast('吏治初值已保存');
    else alert('已保存');
  });
}
