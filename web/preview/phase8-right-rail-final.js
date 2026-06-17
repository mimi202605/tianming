(function(){
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'
  }[ch]));

  const STORE_KEY = 'tm_phase8_pinned_people';
  const state = window.TM_PHASE8_RIGHT_STATE = window.TM_PHASE8_RIGHT_STATE || {};
  state.pinnedPeople = Array.isArray(state.pinnedPeople) ? state.pinnedPeople : loadPinned();

  function toast(text){
    if(typeof window.toastPreview === 'function') window.toastPreview(text);
    else if(typeof window.toast === 'function') window.toast(text);
    else console.log('[Phase8]', text);
  }

  function loadPinned(){
    try {
      const raw = localStorage.getItem(STORE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch(_) {
      return [];
    }
  }

  function savePinned(){
    state.pinnedPeople = Array.from(new Set((state.pinnedPeople || []).filter(Boolean)));
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state.pinnedPeople)); } catch(_) {}
    refreshRail();
    markPinnedRows();
  }

  function personKey(p){
    return String(p && (p.id || p.name || p.charId || p.key) || '');
  }

  function getPeople(){
    const seen = new Set();
    const out = [];
    function add(p){
      if(!p) return;
      const key = personKey(p);
      if(!key || seen.has(key)) return;
      seen.add(key);
      out.push(p);
    }
    if(Array.isArray(window.TM_PERSON_DATA)) window.TM_PERSON_DATA.forEach(add);
    if(typeof window.renwuAllChars === 'function') {
      try { (window.renwuAllChars() || []).forEach(add); } catch(_) {}
    }
    if(typeof window.tmCleanPreviewRenwuChars === 'function') {
      try { (window.tmCleanPreviewRenwuChars() || []).forEach(add); } catch(_) {}
    }
    if(Array.isArray(window.RENWU_ATLAS_CHARS)) window.RENWU_ATLAS_CHARS.forEach(add);
    const gm = window.GM || {};
    if(Array.isArray(gm.chars)) gm.chars.forEach(add);
    if(Array.isArray(gm.allCharacters)) gm.allCharacters.forEach(add);
    if(window.PREVIEW_ACTION_DATA && Array.isArray(window.PREVIEW_ACTION_DATA.letterPeople)){
      window.PREVIEW_ACTION_DATA.letterPeople.forEach(p => add({
        id:p.id, name:p.name, office:p.role, officialTitle:p.role, faction:p.region,
        location:p.region, status:(p.flags || []).join(' / '), portrait:p.portrait
      }));
    }
    return out;
  }

  function findPerson(idOrName){
    const key = String(idOrName || '');
    return getPeople().find(p => personKey(p) === key || p.name === key) || null;
  }

  function extractPersonIdFromRow(row){
    if(!row) return '';
    if(row.dataset.personId) return row.dataset.personId;
    if(row.dataset.renwuId) return row.dataset.renwuId;
    const on = row.getAttribute('onclick') || '';
    let m = on.match(/tmSelectPerson\(['"]([^'"]+)['"]\)/);
    if(m) return m[1];
    m = on.match(/openRenwuTuzhi\(\{\s*selected\s*:\s*['"]([^'"]+)['"]/);
    if(m) return m[1];
    m = on.match(/\)\(['"]([^'"]+)['"]\)/);
    if(m) return m[1];
    const name = row.querySelector('b')?.textContent?.split(/[ ·]/)[0]?.trim();
    const p = name && findPerson(name);
    return p ? personKey(p) : name || '';
  }

  function personRowFromTarget(target){
    if(!target || !target.closest) return null;
    const row = target.closest('.tm-person-row,.rw-card,.rw-card-v2,.renwu-card,.cz-person-card,[data-renwu-id],[data-person-id],.tm-desk-item[onclick*="openRenwuTuzhi"]');
    if(row) return row;
    const btn = target.closest('button');
    if(!btn) return null;
    const text = btn.textContent || '';
    const p = getPeople().find(person => person && person.name && text.includes(person.name));
    if(!p) return null;
    btn.dataset.personId = personKey(p);
    return btn;
  }

  function isPinned(idOrName){
    const p = findPerson(idOrName);
    const key = p ? personKey(p) : String(idOrName || '');
    return state.pinnedPeople.includes(key) || (p && state.pinnedPeople.includes(p.name));
  }

  function pinPerson(idOrName, explicit){
    const p = findPerson(idOrName);
    if(!p) {
      toast('未能识别该人物，无法钉选。');
      return;
    }
    const key = personKey(p);
    const exists = state.pinnedPeople.includes(key);
    if(explicit === false || (explicit == null && exists)){
      state.pinnedPeople = state.pinnedPeople.filter(x => x !== key && x !== p.name);
      toast(`已取消钉选：${p.name}`);
    } else if(!exists) {
      state.pinnedPeople.unshift(key);
      toast(`已钉选：${p.name}`);
    } else {
      toast(`${p.name} 已在钉选臣僚中。`);
    }
    savePinned();
    if(document.getElementById('rpanel')?.classList.contains('show')) {
      const title = document.getElementById('rp-title')?.textContent || '';
      if(/臣|钉选/.test(title) && typeof window.tmPreviewRenderRightPanel === 'function') {
        window.tmPreviewRenderRightPanel('office');
      }
    }
  }

  function markPinnedRows(){
    document.querySelectorAll('.tm-person-row,.rw-card,.rw-card-v2,.renwu-card,.cz-person-card,[data-renwu-id],[data-person-id],.tm-desk-item[onclick*="openRenwuTuzhi"]').forEach(row => {
      const id = extractPersonIdFromRow(row);
      const pinned = id && isPinned(id);
      row.classList.toggle('tm-person-pinned', !!pinned);
      row.title = pinned ? '右键取消钉选' : '右键钉选到右侧“臣”';
    });
  }

  function installContextMenu(){
    if(document.documentElement.dataset.tmPinContextBound) return;
    document.documentElement.dataset.tmPinContextBound = '1';
    const handle = (ev, fromMouseDown) => {
      const row = personRowFromTarget(ev.target);
      if(!row) return;
      const id = extractPersonIdFromRow(row);
      if(!id) return;
      ev.preventDefault();
      ev.stopPropagation();
      const now = Date.now();
      if(!fromMouseDown && state.lastPinGesture && state.lastPinGesture.id === id && now - state.lastPinGesture.time < 700) return;
      state.lastPinGesture = { id, time: now };
      pinPerson(id);
    };
    document.addEventListener('mousedown', ev => {
      if(ev.button === 2) handle(ev, true);
    }, true);
    document.addEventListener('contextmenu', ev => handle(ev, false), true);
  }

  function clearButtonText(btn, text){
    if(!btn) return;
    const count = btn.querySelector('.tm-rc-count,.rc-count');
    Array.from(btn.childNodes).forEach(node => {
      if(node.nodeType === Node.TEXT_NODE) node.remove();
      if(node.nodeType === Node.ELEMENT_NODE && !node.classList.contains('tm-rc-count') && !node.classList.contains('rc-count')) {
        if(node.classList.contains('rc-glyph')) node.textContent = text;
      }
    });
    if(!btn.querySelector('.rc-glyph')) btn.insertBefore(document.createTextNode(text), count || null);
  }

  function openPinnedMinisterPanelEvent(ev){
    if(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
    }
    if(window.tmRightState) window.tmRightState.active = 'office';
    renderPinnedOfficeIntoRightPanel();
    return false;
  }

  function suppressRumorEvent(ev){
    if(ev) {
      ev.preventDefault();
      ev.stopPropagation();
      if(ev.stopImmediatePropagation) ev.stopImmediatePropagation();
      const btn = ev.currentTarget || ev.target?.closest?.('[data-slot="rumor"]');
      if(btn) btn.remove();
    }
    return false;
  }

  function setRailButton(slot, text, label, count){
    document.querySelectorAll(`[data-slot="${slot}"]`).forEach(btn => {
      clearButtonText(btn, text);
      btn.setAttribute('aria-label', label);
      btn.setAttribute('data-tip', label);
      btn.title = label;
      if(slot === 'office') {
        btn.onclick = openPinnedMinisterPanelEvent;
        btn.setAttribute('onclick', 'return tmOpenPinnedMinisterPanel(event)');
      } else if(slot === 'rumor') {
        btn.onclick = suppressRumorEvent;
        btn.setAttribute('onclick', 'return tmSuppressRumorSlot(event)');
      }
      let badge = btn.querySelector('.tm-rc-count,.rc-count');
      if(count == null || Number(count) <= 0) {
        if(badge) badge.remove();
        return;
      }
      if(!badge) {
        badge = document.createElement('span');
        badge.className = btn.classList.contains('tm-rc-icon') ? 'tm-rc-count' : 'rc-count';
        btn.appendChild(badge);
      }
      badge.textContent = String(count);
    });
  }

  function refreshRail(){
    const pinned = (state.pinnedPeople || []).filter(id => findPerson(id)).length;
    setRailButton('ol', '纲', '纲纪总览', 6);
    setRailButton('issue', '政', '问对朝会', 3);
    setRailButton('policy', '文', '文事艺府', null);
    setRailButton('office', '臣', '钉选臣僚', pinned);
    setRailButton('army', '军', '军务边防', 2);
    setRailButton('map', '图', '行政区划', null);
    setRailButton('finance', '户', '户部财计', null);
    setRailButton('archive', '制', '官制衙门', null);
    document.querySelectorAll('[data-slot="rumor"]').forEach(el => el.remove());
  }

  function miniRows(rows){
    return rows.map(([k,v]) => `<div class="tmrp-row"><span>${esc(k)}</span><b>${esc(v || '未录')}</b></div>`).join('');
  }

  function renderPinnedMinisterPanel(){
    const people = (state.pinnedPeople || []).map(findPerson).filter(Boolean);
    const cards = people.map(p => {
      const key = personKey(p);
      const office = p.officialTitle || p.office || p.title || p.role || '未授官';
      const faction = p.party || p.faction || p.group || '未录';
      const loc = p.location || p.region || '未录';
      return `<section class="tmrp-card tmrp-pinned-minister tm-pinned-person-card">
        <div class="tmrp-card-title"><span>${esc(p.name)}</span><small>${esc(office)}</small></div>
        ${miniRows([['党派/势力', faction], ['所在地', loc], ['状态', p.status], ['目标', p.goal || p.personalGoal]])}
        <div class="tmrp-action-row">
          <button class="tmrp-btn primary" onclick="tmPinnedPersonAction('${esc(key)}','wendui')">问对</button>
          <button class="tmrp-btn" onclick="tmPinnedPersonAction('${esc(key)}','letter')">传书</button>
          <button class="tmrp-btn" onclick="tmPinnedPersonAction('${esc(key)}','office')">官制</button>
          <button class="tmrp-btn" onclick="tmPinnedPersonAction('${esc(key)}','detail')">人物志</button>
          <button class="tmrp-btn" onclick="tmUnpinPerson('${esc(key)}')">移除</button>
        </div>
      </section>`;
    }).join('');
    return `<div class="tmrp tm-pinned-minister-panel" data-panel="pinned-ministers">
      <div class="tmrp-summary">
        <div class="tmrp-stat"><b>${people.length}</b><span>钉选臣僚</span></div>
        <div class="tmrp-stat"><b>${people.filter(p => /京|朝|宫|内廷/.test(String(p.location)+String(p.status))).length}</b><span>可召见</span></div>
        <div class="tmrp-stat"><b>${people.filter(p => (p.stress || 0) >= 65).length}</b><span>高压</span></div>
      </div>
      <section class="tmrp-card">
        <div class="tmrp-card-title"><span>钉选说明</span><small>人物卡片右键加入 / 再右键取消</small></div>
        <div class="tmrp-meta">这里承接“随手盯住关键人物”的职能，不再泛泛显示百官。要看全量人物仍从左下“人物图志”进入。</div>
      </section>
      <div class="tmrp-scroll tall">${cards || '<section class="tmrp-card"><div class="tmrp-card-title"><span>尚未钉选人物</span><small>人物图志中右键人物卡片</small></div><div class="tmrp-meta">打开人物图志，在任一人物卡片上点右键，即可把该人物钉到右侧“臣”。</div></section>'}</div>
    </div>`;
  }

  function openOldKeju(){
    if(typeof window.openKejuPanel === 'function') { window.openKejuPanel(); return; }
    if(typeof window.showKejuModal === 'function') { window.showKejuModal(); return; }
    if(typeof window.switchGTab === 'function') { window.switchGTab(null, 'gt-keju'); return; }
    const html = `<section class="tm-bridge-panel tm-person-ceming-panel" role="dialog" aria-modal="true">
      <button class="tm-action-close tm-floating-close" data-close-bridge title="关闭">×</button>
      <div class="tm-ceming-page">
        <header class="tm-ceming-head"><div><h2>科举制度</h2><p>预览页未加载正式科举运行时；正式游戏会调用旧 UI 的科举标签页与 openKejuPanel 流程。</p></div><span class="tm-ceming-mode">旧 UI 流程入口</span></header>
        <div class="tm-ceming-toolbar"><button class="active">状态</button><button>筹办科举</button><button>会试/殿试</button></div>
        <main class="tm-ceming-body"><div class="tm-ceming-grid">
          <article class="tm-ceming-card"><b>制度状态</b><p>读取 P.keju.enabled、examIntervalNote、quotaPerExam、specialRules。</p></article>
          <article class="tm-ceming-card"><b>当前科举</b><p>读取 P.keju.currentExam/currentEnke，并进入 showKejuModal。</p></article>
          <article class="tm-ceming-card"><b>提议筹办</b><p>正式游戏中调用 proposeKejuPreparation，进入朝议/科议链。</p></article>
          <article class="tm-ceming-card"><b>结果入仕</b><p>进士入人物志与待铨队列由 tm-keju-runtime 处理。</p></article>
        </div><aside class="tm-ceming-aside"><h3>接入说明</h3><p>此按钮只负责从“文”面板进入旧科举页，不在文事面板内重做一套科举流程。</p></aside></main>
      </div>
    </section>`;
    if(typeof window.showBridgeOverlay === 'function') window.showBridgeOverlay('tm-keju-preview-overlay', html);
    else toast('预览：正式游戏中将打开旧 UI 科举标签页。');
  }

  function launchChaoyi(mode){
    if(window.tmRightState) window.tmRightState.chaoyiMode = mode || 'changchao';
    if(typeof window.openChaoyi === 'function') {
      window.openChaoyi();
      setTimeout(() => {
        try { if(typeof window._cy_pickMode === 'function') window._cy_pickMode(mode || 'changchao'); } catch(e) { console.warn(e); }
      }, 60);
      return;
    }
    toast('预览：正式游戏中会进入旧朝议流程，这里只保留朝议类型入口。');
  }

  function renderChaoyiOnly(){
    const modes = [
      {id:'changchao', name:'常朝', sub:'例行朝参', desc:'百官列班，诸事逐条裁断', meta:'旧 UI：_cc3_open', img:'img/chaoyi-changchao-scene-v1.png'},
      {id:'tinyi', name:'廷议', sub:'集议大政', desc:'一事多轮辩议，形成共识或独断', meta:'旧 UI：_ty2_openSetup', img:'img/chaoyi-tingyi-scene-v1.png'},
      {id:'yuqian', name:'御前会议', sub:'密召心腹', desc:'少数近臣入对，可记起居或不录', meta:'旧 UI：_yq2_openSetup', img:'img/chaoyi-yuqian-scene-v1.png'}
    ];
    const active = window.tmRightState?.chaoyiMode || 'changchao';
    return `<section class="tmrp-card">
      <div class="tmrp-card-title"><span>朝议类型</span><small>点击后进入旧朝议流程</small></div>
      <div class="tmrp-chaoyi-scenes">${modes.map(m => `<button type="button" class="tmrp-chaoyi-card ${active===m.id?'active':''}" onclick="tmPreviewLaunchChaoyi('${m.id}')"><img src="${esc(m.img)}" alt=""><span class="txt"><b>${esc(m.name)}</b><span>${esc(m.sub)} · ${esc(m.desc)}</span><small>${esc(m.meta)}</small></span></button>`).join('')}</div>
      <div class="tmrp-meta">下方不再放议题、参会人、批示动作等二次流程，避免把旧朝议流程压成一步。</div>
    </section>`;
  }

  function renderIssueChaoyiPanel(){
    return `<div class="tmrp" data-panel="issue">
      <div class="tmrp-tabs">
        <button class="" onclick="tmPreviewRightSetTab('issue','wendui')">问对</button>
        <button class="active" onclick="tmPreviewRightSetTab('issue','chaoyi')">朝议</button>
      </div>
      ${renderChaoyiOnly()}
    </div>`;
  }

  function renderIssueChaoyiIntoRightPanel(){
    if(typeof window.tmRightInstallStyles === 'function') window.tmRightInstallStyles();
    if(typeof window.tmRightInstallRichStyles === 'function') window.tmRightInstallRichStyles();
    const panel = document.getElementById('rpanel');
    if(panel) panel.classList.add('show');
    const title = document.getElementById('rp-title');
    const body = panel?.querySelector('.rp-body');
    if(title) title.textContent = '问对朝会';
    if(body) body.innerHTML = renderIssueChaoyiPanel();
    refreshRail();
  }

  function renderPinnedOfficeIntoRightPanel(){
    if(typeof window.tmRightInstallStyles === 'function') window.tmRightInstallStyles();
    if(typeof window.tmRightInstallRichStyles === 'function') window.tmRightInstallRichStyles();
    refreshRail();
    const panel = document.getElementById('rpanel');
    if(panel) panel.classList.add('show');
    const body = panel?.querySelector('.rp-body');
    const title = document.getElementById('rp-title');
    if(title) title.textContent = '钉选臣僚';
    if(body) body.innerHTML = renderPinnedMinisterPanel();
  }

  function wrapWenshiPanel(){
    const old = window.tmRenderWenshiPanel;
    if(old && old.__phase8FinalWrapped) return;
    const fn = function(){
      const body = old ? old() : '<div class="tmrp"><section class="tmrp-card"><div class="tmrp-meta">文事面板未就绪。</div></section></div>';
      return `<div class="tmrp-keju-dock">
        <button class="tmrp-keju-main" type="button" onclick="tmPreviewOpenKeju()">科 举</button>
        <span>承接旧 UI 科举标签页，不在文事内重做流程</span>
      </div>${body}`;
    };
    fn.__phase8FinalWrapped = true;
    window.tmRenderWenshiPanel = fn;
  }

  function wrapRightPanel(){
    const old = window.tmPreviewRenderRightPanel;
    if(old && old.__phase8FinalWrapped) return;
    const fn = function(slot){
      if(slot === 'rumor') return;
      if(slot === 'issue' && window.tmRightState?.tabs?.issue === 'chaoyi') {
        renderIssueChaoyiIntoRightPanel();
        return;
      }
      if(slot === 'office') {
        renderPinnedOfficeIntoRightPanel();
        return;
      }
      if(old) old(slot);
      refreshRail();
    };
    fn.__phase8FinalWrapped = true;
    window.tmPreviewRenderRightPanel = fn;
  }

  function wrapRightTabs(){
    const old = window.tmPreviewRightSetTab;
    if(old && old.__phase8FinalWrapped) return;
    const fn = function(slot, tab){
      if(window.tmRightState && window.tmRightState.tabs) window.tmRightState.tabs[slot] = tab;
      if(slot === 'issue' && tab === 'chaoyi') {
        renderIssueChaoyiIntoRightPanel();
        return;
      }
      if(old) old(slot, tab);
      else if(typeof window.tmPreviewRenderRightPanel === 'function') window.tmPreviewRenderRightPanel(slot);
    };
    fn.__phase8FinalWrapped = true;
    window.tmPreviewRightSetTab = fn;
  }

  function wrapRightOpen(){
    const old = window.tmPreviewOpenRightPanel;
    if(old && old.__phase8FinalOpenWrapped) return;
    const fn = function(slot){
      if(slot === 'rumor') return;
      if(window.tmRightState) window.tmRightState.active = slot;
      if(slot === 'office') {
        renderPinnedOfficeIntoRightPanel();
        return;
      }
      if(slot === 'issue' && window.tmRightState?.tabs?.issue === 'chaoyi') {
        renderIssueChaoyiIntoRightPanel();
        return;
      }
      if(old) old(slot);
      else if(typeof window.tmPreviewRenderRightPanel === 'function') window.tmPreviewRenderRightPanel(slot);
      refreshRail();
    };
    fn.__phase8FinalOpenWrapped = true;
    window.tmPreviewOpenRightPanel = fn;
  }

  function installRailClickOverride(){
    if(document.documentElement.dataset.tmRightFinalClickBound) return;
    document.documentElement.dataset.tmRightFinalClickBound = '1';
    document.addEventListener('click', ev => {
      const btn = ev.target.closest && ev.target.closest('[data-slot]');
      if(!btn) return;
      const slot = btn.getAttribute('data-slot');
      if(slot === 'rumor') {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        btn.remove();
        return;
      }
      if(slot === 'office') {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        if(window.tmRightState) window.tmRightState.active = 'office';
        renderPinnedOfficeIntoRightPanel();
        return;
      }
      if(slot === 'issue' && window.tmRightState?.tabs?.issue === 'chaoyi') {
        ev.preventDefault();
        ev.stopImmediatePropagation();
        if(window.tmRightState) window.tmRightState.active = 'issue';
        renderIssueChaoyiIntoRightPanel();
      }
    }, true);
  }

  function installStyles(){
    if(document.getElementById('tm-phase8-right-final-style')) return;
    const st = document.createElement('style');
    st.id = 'tm-phase8-right-final-style';
    st.textContent = `
      [data-slot="rumor"]{display:none!important;}
      .tm-person-pinned{border-color:rgba(126,184,167,.70)!important;box-shadow:inset 3px 0 rgba(126,184,167,.74),0 0 0 1px rgba(126,184,167,.14)!important;}
      .tm-person-pinned:after{content:"钉";position:absolute;right:5px;top:4px;min-width:16px;height:16px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:rgba(126,184,167,.18);border:1px solid rgba(126,184,167,.55);color:#bfe9dc;font-size:10px;line-height:1;}
      .tm-person-row,.rw-card,.rw-card-v2,.renwu-card,.cz-person-card,.tm-desk-item[onclick*="openRenwuTuzhi"],[data-renwu-id],[data-person-id]{position:relative;}
      .tmrp-pinned-minister{border-left:3px solid rgba(126,184,167,.65)!important;}
      .tmrp-keju-dock{display:flex;align-items:center;gap:10px;margin:0 0 10px;padding:9px 10px;border:1px solid rgba(201,160,69,.20);background:linear-gradient(90deg,rgba(126,184,167,.10),rgba(0,0,0,.20));color:rgba(232,220,187,.68);font-family:"STKaiti","KaiTi",serif;}
      .tmrp-keju-main{height:34px;min-width:92px;border:1px solid rgba(126,184,167,.52);background:linear-gradient(180deg,rgba(44,83,70,.88),rgba(17,35,31,.94));color:#c8f1e4;font-family:inherit;letter-spacing:.34em;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,255,255,.09),0 5px 13px rgba(0,0,0,.24);}
      .tmrp-keju-main:hover{filter:brightness(1.12);}
    `;
    document.head.appendChild(st);
  }

  function init(){
    installStyles();
    installContextMenu();
    window.tmOpenPinnedMinisterPanel = openPinnedMinisterPanelEvent;
    window.tmSuppressRumorSlot = suppressRumorEvent;
    wrapWenshiPanel();
    wrapRightPanel();
    wrapRightTabs();
    wrapRightOpen();
    installRailClickOverride();
    window.tmRenderChaoyiPanel = renderChaoyiOnly;
    window.tmPreviewLaunchChaoyi = launchChaoyi;
    window.tmPreviewOpenKeju = openOldKeju;
    window.tmPinPerson = pinPerson;
    window.tmUnpinPerson = id => pinPerson(id, false);
    window.tmPinnedPersonAction = function(id, action){
      const p = findPerson(id);
      if(!p) return;
      const name = p.name || id;
      if(action === 'wendui') {
        if(window.GM) window.GM.wenduiTarget = name;
        if(typeof window.openWenduiPick === 'function') window.openWenduiPick(name);
        else if(typeof window.switchGTab === 'function') window.switchGTab(null, 'gt-wendui');
        else if(typeof window.tmPreviewOpenRightPanel === 'function') window.tmPreviewOpenRightPanel('issue');
      } else if(action === 'letter') {
        if(window.GM) window.GM._pendingLetterTo = name;
        if(typeof window.switchGTab === 'function') window.switchGTab(null, 'gt-letter');
        else if(typeof window.openHongyan === 'function') window.openHongyan();
      } else if(action === 'office') {
        if(typeof window.switchGTab === 'function') window.switchGTab(null, 'gt-office');
        else if(typeof window.tmPreviewOpenRightPanel === 'function') window.tmPreviewOpenRightPanel('archive');
      } else if(action === 'detail') {
        if(typeof window.openCharRenwuPage === 'function') window.openCharRenwuPage(name);
        else if(typeof window.viewRenwu === 'function') window.viewRenwu(name);
        else if(typeof window.openRenwuTuzhi === 'function') window.openRenwuTuzhi({selected: personKey(p)});
      }
    };
    refreshRail();
    markPinnedRows();
    const oldOpen = window.openRenwuTuzhi;
    if(oldOpen && !oldOpen.__phase8PinWrapped) {
      const wrapped = function(){
        const ret = oldOpen.apply(this, arguments);
        setTimeout(markPinnedRows, 0);
        return ret;
      };
      wrapped.__phase8PinWrapped = true;
      window.openRenwuTuzhi = wrapped;
    }
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
  requestAnimationFrame(init);
})();
