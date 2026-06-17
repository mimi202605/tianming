  // ═══ 御案批红 · 百官奏疏 (zou-yuan) · 落地 2026-06-02 ═══
  var MEM_TYPE_YUAN = {
    '弹章':{c:'#a83228',label:'弹章',glyph:'劾'},'弹劾':{c:'#a83228',label:'弹章',glyph:'劾'},
    '警报':{c:'#7a2018',label:'警报',glyph:'警'},'军务':{c:'#4a5e8a',label:'军务',glyph:'兵'},
    '边报':{c:'#4a5e8a',label:'边报',glyph:'边'},'荐表':{c:'#557f6f',label:'荐表',glyph:'荐'},
    '政务':{c:'#a8833a',label:'政务',glyph:'政'},'人事':{c:'#8e6aa8',label:'人事',glyph:'铨'},
    '民生':{c:'#b98b2f',label:'民生',glyph:'民'},'经济':{c:'#b98b2f',label:'民生',glyph:'民'},
    'territory':{c:'#a83228',label:'侨置',glyph:'疆'},'谏疏':{c:'#a8833a',label:'谏疏',glyph:'谏'}
  };
  function memTypeYuan(t){ return MEM_TYPE_YUAN[t] || {c:'#a8833a',label:(t||'奏疏'),glyph:'奏'}; }
  var MEM_REL_LABEL = { high:'信据确凿', medium:'尚需查核', low:'风闻待核' };
  var MEM_REL_LEVEL = { high:3, medium:2, low:1 };
  function memRel(m){ return (m && m.reliability) || 'medium'; }
  var MEM_STATUS_TEXT = { pending:'待批', pending_review:'待核', hold:'留中', held:'留中', approved:'已准', rejected:'已驳', annotated:'已批示', referred:'已转', court_debate:'付廷议', done:'已批' };
  function memIsSecret(m){ return m && (m.subtype === '密折' || m.subtype === '密揭'); }
  function memHeldTurns(m){
    var gm = window.GM || {}; var now = Number(gm.turn || 1);
    var arr = (m.raw && Number(m.raw._arrivedTurn)) || Number(m.turn) || now;
    return Math.max(0, now - arr);
  }
  function memCharOf(m){
    try { if (typeof window.findCharByName === 'function') return window.findCharByName(m.from); } catch(_) {}
    return null;
  }
  function memOpener(m){
    var f = String(m.from || '');
    if (/^[一-龥]{2,4}$/.test(f) && !/(司|厂|监|部|院|寺|军|民|塘报|有司|衙|生员|士民|联名)/.test(f)) return '臣' + f + '谨奏：';
    return '';
  }

  // 折子 (左·奏牍架)
  function renderMemFolderYuan(m, activeId){
    var tm = memTypeYuan(m.type), g = memorialGroupKey(m), secret = memIsSecret(m);
    var opened = state.memorialOpened && state.memorialOpened[m.id];
    var held = memHeldTurns(m);
    var sealedTag = secret ? (opened ? '密折' : '密 · 封缄') : (m.subtype && m.subtype !== '公疏' ? m.subtype : '');
    var tail = g === 'done'
      ? '<span class="zf-stamp">' + esc(MEM_STATUS_TEXT[m.status] || '已批') + '</span>'
      : (g === 'held' && held > 0 ? '<div class="zf-held' + (held >= 2 ? ' warn' : '') + '">已留中 ' + held + ' 回' + (held >= 2 ? ' · 恐续奏' : '') + '</div>' : '<div style="margin-top:5px">' + memRelDots(memRel(m)) + '</div>');
    return '<button type="button" class="zou-folder ' + (String(activeId) === String(m.id) ? 'active' : '') + (g === 'done' ? ' done' : '') + '" data-desk-action="select-memorial-desk" data-id="' + attr(m.id || '') + '" style="--tc:' + tm.c + '">' +
      '<div class="zf-top"><span class="zf-type" style="background:' + tm.c + '">' + esc(tm.label) + '</span>' +
        (sealedTag ? '<span class="zf-sub' + (secret && !opened ? ' mi' : '') + '">' + esc(sealedTag) + '</span>' : '') +
        ((m.raw && m.raw._remoteFrom) ? '<span class="zf-remote" title="远方奏疏">远</span>' : '') +
        (g === 'urgent' ? '<span class="zf-urgent"></span>' : '') + '</div>' +
      '<div class="zf-title">' + esc(m.title || '奏疏') + '</div>' +
      '<div class="zf-meta"><b style="color:var(--ink)">' + esc(m.from || '臣工') + '</b><span class="dot">·</span><span>' + esc(m.dept || m.office || '通政司') + '</span></div>' +
      tail + '</button>';
  }
  function memRelDots(rel){
    var lv = MEM_REL_LEVEL[rel] || 0, h = '';
    for (var i = 0; i < 3; i++) h += '<i class="' + (i < lv ? '' : 'off') + '">●</i>';
    return '<span class="zf-rel" title="' + attr(MEM_REL_LABEL[rel] || '') + '">' + h + '</span>';
  }

  // 奏本抬头
  function memBenHead(m, tm, g){
    var statusChip = g === 'urgent' ? '<span class="chip hot">急奏</span>' : g === 'done' ? '<span class="chip green">' + esc(MEM_STATUS_TEXT[m.status] || '已批') + '</span>' : g === 'held' ? '<span class="chip">留中</span>' : '<span class="chip">待批</span>';
    var rel = memRel(m), relCls = rel === 'low' ? 'lo' : '';
    var ch = memCharOf(m), faction = (ch && (ch.faction || ch.group)) || '';
    var impeachT = '';
    if (tm.label === '弹章' && /弹劾/.test(String(m.title || ''))) {
      var _it = (String(m.title).split('弹劾')[1] || '').replace(/(冒功|欺君|不法|贪墨|贪|失职|渎职|结党|专擅|跋扈).*$/, '').replace(/[，。、；：·等\s].*$/, '').slice(0, 12);
      if (_it.length >= 2) impeachT = _it;
    }
    return '<div class="ben-head"><div class="bh-status">' + statusChip + '</div><div class="bh-row">' +
      '<div class="bh-seal" style="--tc:' + tm.c + '"><b>' + esc(tm.glyph) + '</b><span>' + esc(tm.label) + '</span></div>' +
      '<div class="bh-main"><div class="bh-title">' + esc(m.title || '奏疏') + '</div>' +
        '<div class="bh-author">具题　<b>' + esc(m.from || '臣工') + '</b>　' + esc(m.office || (ch && (ch.officialTitle || ch.title)) || '') + '　〔' + esc(m.dept || '通政司') + '〕</div>' +
        '<div class="bh-tags">' +
          '<span class="bh-tag">' + esc(tm.label) + '</span>' +
          (m.subtype ? '<span class="bh-tag' + (memIsSecret(m) ? ' mi' : '') + '">' + esc(m.subtype) + '</span>' : '') +
          (impeachT ? '<span class="bh-tag impeach">被劾 · ' + esc(impeachT) + '</span>' : '') +
          ((m.raw && m.raw._remoteFrom) ? '<span class="bh-tag remote">远方 · ' + esc(m.raw._remoteFrom) + '</span>' : '') +
          '<span class="bh-tag">可靠 <span class="rel-d ' + relCls + '">' + esc(MEM_REL_LABEL[rel] || '未明') + '</span></span>' +
          (faction ? '<span class="bh-tag">' + esc(faction) + '</span>' : '') +
        '</div></div></div></div>';
  }

  // 御览批红 (中)
  function renderMemReaderYuan(m){
    if (!m) return '<div class="ben-empty"><div class="ben-empty-seal">奏</div><h3>案 牍 清 净</h3><p>百官无事启奏　·　通政司暂无折件转入</p><small>新奏疏会于每回合由百官、有司、边镇陆续呈入</small></div>';
    var tm = memTypeYuan(m.type), g = memorialGroupKey(m);
    // 密折封缄态
    if (memIsSecret(m) && !(state.memorialOpened && state.memorialOpened[m.id])) {
      return memBenHead(m, tm, g) +
        '<div class="ben-sealed"><button type="button" class="wax" data-desk-action="memorial-unseal-desk" data-id="' + attr(m.id || '') + '"><b>缄</b></button>' +
        '<div class="sealed-hint"><h4>密 折 · 火 漆 封 缄</h4><p>' + esc(m.from || '') + ' 直达御前 · 不付外廷拟议<br>点火漆启封，方可御览</p></div></div>';
    }
    var done = g === 'done';
    var mid = 'mem-formal-' + (m.rawIndex != null ? m.rawIndex : String(m.id || '').replace(/[^a-zA-Z0-9_-]/g, ''));
    var replyId = mid + '-reply';
    var reply = m.reply || '';
    state.memorialReplies = state.memorialReplies || {};
    if (Object.prototype.hasOwnProperty.call(state.memorialReplies, replyId)) reply = state.memorialReplies[replyId];
    var body = m.text || m.content || '暂无正文。';
    var opener = memOpener(m);
    var held = memHeldTurns(m);
    var longBody = body.length > 180;
    var bodyHtml = longBody
      ? '<div class="ben-text collapsed" id="' + attr(mid) + '-bt">' + esc(body) + '</div><button type="button" class="ben-toggle" onclick="var b=document.getElementById(&quot;' + attr(mid) + '-bt&quot;);if(b){var c=b.classList.toggle(&quot;collapsed&quot;);this.textContent=c?&quot;▼ 展开全文&quot;:&quot;▲ 收起&quot;;}">▼ 展开全文</button>'
      : '<div class="ben-text" id="' + attr(mid) + '-bt">' + esc(body) + '</div>';
    var quick = done ? '' : '<div class="pizhu-quick">' + ['知道了', '依议', '该部知道', '着实奏来', '览', '准奏，钦此', '着会官详议'].map(function(p){
      return '<span class="qphrase" onclick="var t=document.getElementById(&quot;' + replyId + '&quot;);if(t){t.value=t.value?t.value+&quot;，&quot;+this.textContent:this.textContent;t.focus();}">' + esc(p) + '</span>';
    }).join('') + '</div>';
    return memBenHead(m, tm, g) +
      (g === 'held' && held > 0 ? '<div class="held-banner' + (held >= 2 ? ' warn' : '') + '"><b>已留中 ' + held + ' 回合</b>' + (held >= 2 ? '　·　' + esc(m.from || '具题人') + '恐焦虑续奏，或求见当面追问' : '　·　御前暂存，可继续保留或下发') + '</div>' : '') +
      '<div class="ben-body"><div class="ben-paper">' +
        (opener ? '<div class="bp-open">' + esc(opener) + '</div>' : '') +
        bodyHtml +
        '<div class="bp-close">臣不胜屏营待命之至，谨奏。</div>' +
      '</div></div>' +
      '<div class="ben-foot">' +
        '<div class="pizhu-lbl"><b>朱 批</b>' + (done ? '<small>已批 · 朱批归档</small>' : '<small>御笔朱批，下发有司</small>') + '</div>' +
        quick +
        '<textarea class="pizhu-ta" id="' + attr(replyId) + '" data-desk-memorial-reply ' + (done ? 'readonly' : '') + ' placeholder="御笔亲批……">' + esc(reply) + '</textarea>' +
        memReaderActs(m, g, done, replyId) +
      '</div>';
  }
  function memReaderActs(m, g, done, replyId){
    if (done) return '<div class="pizhu-acts"><span style="font-size:12px;color:var(--ink-faint);letter-spacing:0.06em">此折已批 · ' + esc(MEM_STATUS_TEXT[m.status] || '已决') + ' · 可追踪回函与承办</span></div>';
    var bd = function(dec){ return { id: m.id || '', decision: dec, replyid: replyId }; };
    var a = '<div class="pizhu-acts">';
    a += actionBtn('准奏', 'memorial-decision-desk', bd('approved'), 'pact primary');
    a += actionBtn('驳回', 'memorial-decision-desk', bd('rejected'), 'pact danger');
    a += actionBtn('批示', 'memorial-decision-desk', bd('annotated'), 'pact');
    a += actionBtn('转有司', 'memorial-decision-desk', bd('referred'), 'pact');
    a += actionBtn('发廷议', 'memorial-decision-desk', bd('court_debate'), 'pact');
    if (g !== 'held') a += actionBtn('留中', 'memorial-decision-desk', bd('hold'), 'pact');
    a += '<span class="pact-sep"></span>';
    a += actionBtn('摘入拟诏', 'memorial-edict-desk', { id: m.id || '' }, 'pact jade');
    a += actionBtn('传召问询', 'memorial-summon-desk', { id: m.id || '' }, 'pact');
    if (m.raw && m.raw._qiaozhiTarget) a += actionBtn('侨置决策', 'memorial-qiaozhi-desk', { id: m.id || '' }, 'pact primary');
    a += '</div>';
    return a;
  }

  // 票拟与影响 (右)
  function renderMemAsideYuan(m){
    if (!m) return '';
    var g = memorialGroupKey(m), rel = memRel(m), relLv = MEM_REL_LEVEL[rel] || 0;
    var ch = memCharOf(m);
    var loyalty = ch && (typeof ch.loyalty === 'number' ? ch.loyalty : null);
    var faction = (ch && (ch.faction || ch.group)) || m.dept || '';
    var relation = ch && (ch.persona || ch.personality || ch.bio || ch.note || ch.desc) || '';
    var niyi = m.raw && (m.raw._fuchenNiyi || m.raw.piaoni);
    var _replyId = 'mem-formal-' + (m.rawIndex != null ? m.rawIndex : String(m.id || '').replace(/[^a-zA-Z0-9_-]/g, '')) + '-reply';
    var aside = '';
    // 辅臣拟议 (AI 生成于 endturn·写 raw._fuchenNiyi·未生成则占位)·niyi 在时可一键采入朱批
    aside += '<div class="card"><div class="card-hd"><span class="ci">拟</span>辅臣拟议<span class="hd-note">辅臣之见 · 可采可驳</span></div><div class="card-bd">' +
      (niyi ? '<div class="piaoni">' + esc(niyi) + '<span class="pn-from">—— 辅臣 拟议</span></div>'
            + (g !== 'done' ? '<button type="button" class="piaoni-take" data-niyi="' + attr(niyi) + '" onclick="var t=document.getElementById(&quot;' + _replyId + '&quot;);if(t){if(!t.readOnly){var n=this.getAttribute(&quot;data-niyi&quot;);t.value=t.value?t.value+&quot;　&quot;+n:n;t.focus();}}">采拟议入朱批</button>' : '')
            : '<div class="piaoni" style="color:var(--ink-faint)">辅臣拟议将于推演时由辅臣拟具（带其立场私心，可采可驳）。<span class="pn-from">—— 待本回辅臣拟议</span></div>') +
    '</div></div>';
    // 具题之臣
    aside += '<div class="card"><div class="card-hd"><span class="ci">臣</span>具题之臣</div><div class="card-bd">' +
      '<div class="who"><div class="who-face">' + esc((m.from || '臣').slice(0, 1)) + '</div>' +
        '<div class="who-info"><b>' + esc(m.from || '臣工') + '</b><span>' + esc(m.office || (ch && (ch.officialTitle || ch.title)) || '') + '</span><span>' + esc(m.dept || '') + (faction ? ' · ' + esc(faction) : '') + '</span></div></div>' +
      '<dl class="who-meta">' +
        (loyalty != null ? '<dt>忠悃</dt><dd>' + loyalty + ' / 100</dd>' : '') +
        '<dt>可靠</dt><dd><span class="relbar">' + [0, 1, 2].map(function(i){ return '<i class="' + (i < relLv ? 'on' : '') + (rel === 'low' && i < relLv ? ' bad' : '') + '"></i>'; }).join('') + '</span></dd>' +
      '</dl>' +
      (relation ? '<div style="margin-top:9px;font-size:11.5px;color:var(--ink-soft);line-height:1.6;font-family:var(--font-doc)">「' + esc(compactText(String(relation), 60)) + '」</div>' : '') +
    '</div></div>';
    // 批阅链路
    aside += '<div class="card"><div class="card-hd"><span class="ci">链</span>批阅链路</div><div class="card-bd"><div class="chain">' +
      memChainRow('源', '来源', '奏疏 · ' + esc(memTypeYuan(m.type).label) + (m.subtype ? ' · ' + esc(m.subtype) : '')) +
      memChainRow('批', '批复', '准奏 / 驳回 / 留中 / 转有司 / 发廷议') +
      memChainRow('行', '执行', '君主 → 中枢辅臣 → 有司 → 州县地方') +
      memChainRow('档', '归档', '写入近事 · 人物记忆 · 史官实录') +
    '</div></div></div>';
    // 批后结果 (仅已批回显·不事前预估)
    if (g === 'done') {
      aside += '<div class="card"><div class="card-hd"><span class="ci">果</span>批后结果 · 本折后续</div><div class="card-bd"><div class="chain">' +
        memFollowups(m).map(function(r){ return memChainRow(r[0].slice(0, 1), r[0], esc(r[1])); }).join('') +
      '</div></div></div>';
    } else {
      aside += '<div class="card"><div class="card-hd"><span class="ci">果</span>批后结果</div><div class="card-bd"><div class="imp-pending">尚未批复。<br>朱批下发后，此处回显该折引发的<b>实际</b>影响（民心 / 财政 / 人物 / 边事…）。<br><span class="imp-note">后果应自然发生 · 不事前预告</span></div></div></div>';
    }
    return aside;
  }
  function memChainRow(d, b, p){ return '<div class="chain-row"><span class="chain-dot">' + esc(d) + '</span><div><b>' + esc(b) + '</b><p>' + p + '</p></div></div>'; }
  function memFollowups(m){
    var rows = [], st = String(m.status || '');
    var DEC = { approved:'已准奏 · 交有司施行', rejected:'已驳回 · 所请不行', annotated:'已批示 · 候有司遵行', referred:'已交有司核议', court_debate:'已付廷议 · 候朝议' };
    rows.push(['朱批', DEC[st] || '已得朱批']);
    if (st === 'referred') rows.push(['承办', ((m.raw && m.raw._referredTo) ? m.raw._referredTo + ' ' : '所交有司') + '应于后续上折复议']);
    if (m.raw && m.raw._remoteFrom) {
      var _now = Number((window.GM || {}).turn || 1), _dt = Number(m.raw._replyDeliveryTurn || 0);
      rows.push(['回传', (_dt && _now >= _dt) ? '朱批已送达 · ' + (m.from || '具题人') + '已知结果' : '朱批回传中 · 信使在途 · ' + (m.from || '具题人') + '尚不知结果']);
    }
    if (m.from) rows.push(['具题人', m.from + '：' + (st === 'rejected' ? '闻驳 · 或忧惧或离心' : '闻准 · 感念在心')]);
    rows.push(['归档', '已入近事 · 人物记忆 · 史官实录（后续于近事、实录追踪）']);
    return rows;
  }

  // 在途奏疏
  function renderMemTransitYuan(){
    var gm = window.GM || {};
    var pending = Array.isArray(gm._pendingMemorialDeliveries) ? gm._pendingMemorialDeliveries.filter(function(m){ return !m || m.status === 'in_transit' || m.status === 'intercepted'; }) : [];
    var rows = firstArray(pending, gm.memorialTransit, gm._memorialTransit, gm.zoushuTransit).slice(0, 4);
    if (!rows.length) return '';
    return '<div class="transit"><div class="transit-t">在途奏疏 · ' + rows.length + ' 件</div>' +
      rows.map(function(t){
        var from = t.from || t.sender || '地方', eta = t.eta || t.due || '在途';
        return '<div class="transit-row"><b>' + esc(from) + '</b><em>' + esc(eta) + '</em><div style="color:var(--ink-faint);font-size:10.5px;margin-top:2px">' + esc([t.office || t.dept || '衙门', t.type || '奏疏'].filter(Boolean).join(' · ')) + '</div><div style="margin-top:1px">' + esc(compactText(t.body || t.text || t.content || '', 60)) + '</div></div>';
      }).join('') + '</div>';
  }

  // 主面板
  function renderFormalMemorialPanel(){
    installMemorialYuanStyles();
    restoreFormalDraftsFromGM(false);
    var mems = getMemorials();
    var filter = state.memorialFilter || 'all';
    if (filter === 'review') filter = 'all';
    var visible = mems.filter(function(m){ return memorialMatchesFormal(filter, m); });
    // active
    var active = mems.find(function(m){ return String(m.id) === String(state.memorialId || ''); });
    if (!active || !memorialMatchesFormal(filter, active)) active = visible[0] || mems[0] || null;
    if (active) state.memorialId = active.id;
    // 筛选签条
    var filters = [['all', '全部'], ['urgent', '急奏'], ['pending', '百官启奏'], ['held', '留中'], ['done', '已批']];
    var filterHtml = filters.map(function(f){
      var n = mems.filter(function(m){ return memorialMatchesFormal(f[0], m); }).length;
      return '<button type="button" class="filter ' + (filter === f[0] ? 'active' : '') + '" data-desk-action="memorial-filter-desk" data-filter="' + attr(f[0]) + '"><span>' + esc(f[1]) + '</span><span class="fc">' + n + '</span></button>';
    }).join('');
    // 折子列表 (分组)
    var order = ['urgent', 'pending', 'held', 'done'];
    var GLBL = { urgent: '急奏待批', pending: '百官启奏', held: '留中之折', done: '已批档案' };
    var listHtml = order.map(function(gk){
      var rows = visible.filter(function(m){ return memorialGroupKey(m) === gk; });
      if (!rows.length) return '';
      return '<div class="shelf-group"><div class="shelf-group-t">' + esc(GLBL[gk]) + ' <small>' + rows.length + ' 件</small></div>' +
        rows.map(function(m){ return renderMemFolderYuan(m, state.memorialId); }).join('') + '</div>';
    }).join('') || '<div style="padding:30px 10px;text-align:center;color:var(--ink-faint);font-size:12.5px;">案牍清净　无此类奏疏</div>';
    var pend = mems.filter(function(m){ return memorialGroupKey(m) !== 'done'; }).length;
    var urg = mems.filter(function(m){ return memorialGroupKey(m) === 'urgent'; }).length;
    return '<section class="zou-yuan">' +
      '<div class="zou-titlebar"><div class="zt-center"><div class="zt-main">百 官 奏 疏</div><div class="zt-sub">通政司　百官启奏　御前批红</div></div>' +
        '<div class="zou-chips"><span class="chip green">本回 ' + pend + ' 件</span><span class="chip hot">急 ' + urg + '</span></div></div>' +
      '<div class="zou-body">' +
        '<aside class="shelf"><div class="shelf-hd"><span class="shelf-seal">奏</span><div><b>朱批案牍</b><span>急奏 · 留中 · 已批</span></div></div>' +
          '<div class="filters">' + filterHtml + '</div>' +
          '<div class="shelf-scroll">' + listHtml + '</div>' +
          renderMemTransitYuan() +
        '</aside>' +
        '<main class="read"><article class="zouben">' + renderMemReaderYuan(active) + '</article></main>' +
        '<aside class="aside">' + renderMemAsideYuan(active) + '</aside>' +
      '</div></section>';
  }
