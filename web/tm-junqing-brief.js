// tm-junqing-brief.js — 边报·天下军情(从活势力关系算敌我大势 digest·开局即见·每回合刷新)
//   命门/代入:把分散的敌情(谁与本朝为敌、其姿态多凶)汇成一份玩家可读的「边报」,营造「山雨欲来」的战略压迫感,
//             并为开局抉择(和战/南幸/守御)提供一眼可见的依据。绍宋开局的魂之一=金军势必再南的迫近。
//   跨朝代:纯通用——从 GM.factionRelations(敌对关系)+ faction.posture/aggression 算出,任何剧本即用
//           (天启会算出后金/察哈尔/流寇,etc.)。gated junqingBriefEnabled(默认关·sc 设·绍宋开)。
//   平行时空:只用 posture(姿态)+aggression(凶悍档)+关系类型,不直引 factionRelation.desc(其中或含未来事件名)。
//   surface:复用御案时政 currentIssues——注入 1 条 id=iss_junqing 信息条(无 choices·渲染器有守卫·安全),无威胁则不显/移除。
(function (global) {
  'use strict';

  function _on(GM) { return !!(GM && GM._junqingBriefEnabled); }

  // 英文 posture → 中文(中文 posture 直接用);可扩展·跨朝代通用词
  var POSTURE = {
    all_out_invasion: '倾国入侵', invasion: '大举入侵', raid: '寇掠边境', aggressive: '进取扩张',
    expansion: '拓土争疆', hostile: '敌视', offensive: '攻势', defensive: '守势',
    neutral: '观望', vassal: '称藩', ally: '盟好', tributary: '朝贡'
  };
  var RTYPE = { enemy_total: '势不两立', predator: '必灭之心', enemy: '仇雠', war: '交兵', hostile: '敌视', rival: '宿敌' };

  function _post(p) { return p ? (POSTURE[p] || p) : ''; }
  function _aggrTier(a) { a = a || 0; return a >= 80 ? '虎狼凶悍' : a >= 50 ? '锐意进取' : a >= 25 ? '枕戈戒备' : '按兵观望'; }

  function _playerFac(GM) {
    try {
      var pc = (GM.chars || []).find(function (x) { return x && (x.isPlayer || (GM.playerCharacterId && (x.id === GM.playerCharacterId || x.name === GM.playerCharacterId))); });
      var nm = pc ? (pc.faction || pc.factionName || '') : '';
      var f = (GM.facs || []).find(function (x) { return x && (x.name === nm || x.id === nm); });
      return { name: nm, id: f ? f.id : nm };
    } catch (e) { return { name: '', id: '' }; }
  }

  // 从玩家视角算敌对/威胁势力(去重·按凶悍排序)
  function _threats(GM) {
    var pf = _playerFac(GM);
    if (!pf.name && !pf.id) return [];
    var facBy = function (k) { return (GM.facs || []).find(function (x) { return x && (x.id === k || x.name === k); }); };
    var HOST = /enemy|predator|war|hostile|rival|敌|战|寇|invad/i;
    var seen = {}, out = [];
    (GM.factionRelations || []).forEach(function (r) {
      if (!r) return;
      var other = null, theirStance = null;
      if (r.from === pf.id || r.from === pf.name) { other = r.to; theirStance = r.reverseValue; }
      else if (r.to === pf.id || r.to === pf.name) { other = r.from; theirStance = r.value; }
      else return;
      var hostile = HOST.test(r.type || '') || (theirStance != null && theirStance < 25);
      if (!hostile) return;
      var of = facBy(other);
      var key = of ? of.id : other;
      if (!key || seen[key]) return;
      seen[key] = 1;
      out.push({ name: of ? of.name : other, posture: of ? of.posture : '', aggr: of ? (of.aggression || 0) : 0, type: r.type || '' });
    });
    out.sort(function (a, b) { return (b.aggr || 0) - (a.aggr || 0); });
    return out;
  }

  function build(GM) { if (!GM || !_on(GM)) return; GM._junqingBrief = _threats(GM); _sync(GM); }
  function refresh(GM) { if (!GM || !_on(GM)) return; GM._junqingBrief = _threats(GM); _sync(GM); }

  function _line(t) {
    var bits = [];
    var p = _post(t.posture); if (p) bits.push(p);
    if (t.aggr > 0) bits.push(_aggrTier(t.aggr));   // 凶悍档仅在有 aggression 数据时显·缺失则不臆测(免「观望·必灭」自相矛盾)
    var rt = RTYPE[t.type]; if (rt) bits.push(rt);
    if (!bits.length) bits.push('敌对');
    return '· ' + t.name + ' —— ' + bits.join('·');
  }

  function _sync(GM) {
    if (!Array.isArray(GM._junqingBrief)) return;
    if (!Array.isArray(GM.currentIssues)) GM.currentIssues = [];
    var ts = GM._junqingBrief;
    var idx = -1;
    for (var i = 0; i < GM.currentIssues.length; i++) { if (GM.currentIssues[i] && GM.currentIssues[i].id === 'iss_junqing') { idx = i; break; } }
    if (!ts.length) { if (idx >= 0) GM.currentIssues.splice(idx, 1); return; }   // 无威胁→不显
    var desc = '探事司、沿边帅司汇报，天下兵势如下——\n\n【外患 · 敌我大势】\n' + ts.map(_line).join('\n')
      + '\n\n(凶悍档据敌势而定·随局势每回合更新)';
    var issue = { id: 'iss_junqing', title: '边报 · 天下军情', description: desc, category: '军情', status: 'pending', raisedTurn: GM.turn || 1, _junqing: true, _info: true };
    if (idx >= 0) GM.currentIssues[idx] = issue; else GM.currentIssues.unshift(issue);
  }

  function aiContextLine(GM) {
    if (!GM || !_on(GM) || !Array.isArray(GM._junqingBrief) || !GM._junqingBrief.length) return '';
    return '【边报·军情】本朝当面之敌：' + GM._junqingBrief.slice(0, 5).map(function (t) { return t.name + '(' + (_post(t.posture) || _aggrTier(t.aggr)) + ')'; }).join('、') + '。\n';
  }

  global.TMJunqing = { on: _on, build: build, refresh: refresh, aiContextLine: aiContextLine };
})(typeof window !== 'undefined' ? window : globalThis);
