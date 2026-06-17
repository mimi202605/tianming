(function(){
  'use strict';

  const $ = id => document.getElementById(id);
  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch]));

  const state = window.TM_ACTION_STATE = window.TM_ACTION_STATE || {};
  const data = window.PREVIEW_ACTION_DATA = window.PREVIEW_ACTION_DATA || {};

  state.edictDrafts = state.edictDrafts || {};
  state.edictCat = state.edictCat || 'pol';
  state.playerAction = state.playerAction || '与兵部尚书孙承宗于文华殿议辽饷，又召内阁问江南漕运。夜览边报至三更，命司礼监明日呈厂卫风闻册。';

  function installEdictStyles(){
    if(document.getElementById('tm-edict-ui-style')) return;
    const style = document.createElement('style');
    style.id = 'tm-edict-ui-style';
    style.textContent = `
      .tm-action-panel .tm-action-body.edict{height:100%;}
      .edict-sug-v2{
        display:grid;
        grid-template-columns:44px minmax(0,1fr);
        align-items:start;
        gap:9px;
        position:relative;
        box-sizing:border-box;
        padding:9px;
        border:1px solid rgba(201,160,69,.18);
        border-radius:4px;
        background:
          linear-gradient(90deg,rgba(126,64,36,.12),rgba(0,0,0,.12)),
          rgba(255,245,210,.025);
      }
      .edict-sug-v2+.edict-sug-v2{margin-top:8px;}
      .edict-sug-v2>div{min-width:0;}
      .edict-sug-portrait{
        width:42px;
        height:50px;
        max-width:42px;
        max-height:50px;
        display:block;
        object-fit:cover;
        border:1px solid rgba(201,160,69,.35);
        background:#16100b;
        filter:saturate(.88) contrast(1.02);
      }
      .edict-sug-v2 b{
        display:block;
        color:#f2d98d;
        font-size:12px;
        line-height:1.35;
        white-space:nowrap;
        overflow:hidden;
        text-overflow:ellipsis;
      }
      .edict-sug-v2 p{
        margin:4px 0 7px;
        color:rgba(238,227,194,.76);
        font-size:12px;
        line-height:1.55;
      }
      .edict-sug-v2 .tm-chip-row{
        display:flex;
        flex-wrap:wrap;
        align-items:center;
        gap:4px;
        min-width:0;
      }
      .edict-sug-footer{
        display:flex;
        align-items:center;
        justify-content:space-between;
        gap:8px;
      }
      .edict-sug-adopt{
        flex:0 0 auto;
        min-height:25px;
        padding:0 10px;
        border:1px solid rgba(213,176,95,.42);
        border-radius:3px;
        background:linear-gradient(180deg,rgba(80,44,25,.88),rgba(25,18,13,.92));
        color:#f0d68d;
        cursor:pointer;
        font-family:"STKaiti","KaiTi",serif;
        letter-spacing:.12em;
      }
      .edict-sug-adopt:hover{border-color:rgba(240,214,141,.68);background:linear-gradient(180deg,rgba(103,55,30,.95),rgba(30,21,14,.96));}
      .edict-adopt-menu{
        position:fixed;
        z-index:99999;
        min-width:168px;
        padding:6px;
        border:1px solid rgba(201,160,69,.34);
        border-radius:5px;
        background:linear-gradient(180deg,rgba(33,24,17,.98),rgba(12,9,7,.98));
        box-shadow:0 16px 36px rgba(0,0,0,.58);
        font-family:"STKaiti","KaiTi",serif;
      }
      .edict-adopt-menu-title{
        padding:4px 7px 7px;
        color:rgba(232,220,187,.58);
        font-size:11px;
        letter-spacing:.14em;
        border-bottom:1px solid rgba(201,160,69,.16);
        margin-bottom:5px;
      }
      .edict-adopt-menu button{
        display:grid;
        grid-template-columns:24px minmax(0,1fr);
        gap:7px;
        align-items:center;
        width:100%;
        min-height:30px;
        text-align:left;
        border:0;
        background:transparent;
        color:#eadfbd;
        cursor:pointer;
        font-family:inherit;
        padding:4px 7px;
      }
      .edict-adopt-menu button:hover{background:rgba(201,160,69,.10);}
      .edict-adopt-menu i{
        display:grid;
        place-items:center;
        width:22px;
        height:22px;
        border-radius:50%;
        font-style:normal;
        border:1px solid rgba(201,160,69,.30);
        color:#f2d98d;
        background:rgba(0,0,0,.24);
      }
      .edict-polish-scroll{
        position:relative;
        margin-top:14px;
        padding:22px 26px 18px;
        border:1px solid rgba(129,84,38,.42);
        background:linear-gradient(180deg,rgba(244,226,178,.95),rgba(213,184,125,.94));
        color:#2d1c10;
        box-shadow:inset 0 0 0 1px rgba(255,252,220,.45),0 12px 28px rgba(0,0,0,.36);
      }
      .edict-polish-scroll::before,.edict-polish-scroll::after{
        content:"";
        position:absolute;
        left:14px;
        right:14px;
        height:8px;
        border-radius:8px;
        background:linear-gradient(90deg,#5a321d,#9b6a36,#5a321d);
        box-shadow:0 2px 5px rgba(0,0,0,.35);
      }
      .edict-polish-scroll::before{top:-5px;}
      .edict-polish-scroll::after{bottom:-5px;}
      .edict-polish-title{
        text-align:center;
        margin-bottom:12px;
        color:#7a1f17;
        font-size:20px;
        letter-spacing:.42em;
        font-family:"STKaiti","KaiTi",serif;
      }
      .edict-polish-text{
        width:100%;
        min-height:210px;
        box-sizing:border-box;
        border:0;
        outline:0;
        resize:vertical;
        background:transparent;
        color:#2d1c10;
        font-family:"STKaiti","KaiTi",serif;
        font-size:15px;
        line-height:1.95;
        white-space:pre-wrap;
      }
      .edict-polish-seal{
        position:absolute;
        right:28px;
        bottom:64px;
        width:70px;
        height:70px;
        border:3px solid rgba(143,31,21,.75);
        color:rgba(143,31,21,.86);
        display:grid;
        place-items:center;
        text-align:center;
        font-size:12px;
        line-height:1.15;
        transform:rotate(-8deg);
        font-weight:700;
      }
      .edict-polish-actions{display:flex;justify-content:center;gap:9px;margin-top:14px;}
      .edict-xingzhi{
        margin-top:16px;
        border:1px solid rgba(201,160,69,.18);
        background:rgba(255,245,210,.035);
        padding:12px;
      }
      .edict-xingzhi-head{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;font-family:"STKaiti","KaiTi",serif;}
      .edict-xingzhi-head b{color:#f2d98d;letter-spacing:.22em;font-size:15px;font-weight:500;}
      .edict-xingzhi-head span{color:rgba(224,211,171,.55);font-size:11px;}
      .edict-xingzhi textarea{min-height:92px;}
      .edict-xingzhi-history{margin-top:10px;display:grid;gap:6px;max-height:140px;overflow:auto;scrollbar-color:rgba(201,160,69,.48) rgba(0,0,0,.22);}
      .edict-xingzhi-row{display:grid;grid-template-columns:74px minmax(0,1fr);gap:8px;padding:6px 8px;border:1px solid rgba(201,160,69,.10);background:rgba(0,0,0,.12);font-size:12px;line-height:1.55;color:rgba(232,220,187,.72);}
      .edict-xingzhi-row span{color:#d5b05f;}
    `;
    document.head.appendChild(style);
  }

  data.edictCategories = data.edictCategories || [
    {id:'pol', label:'政令', badge:'政', hint:'官制、任免、抚谕、禁约', forecast:'皇权 +2，士林疑惧 +1，执行难度中'},
    {id:'mil', label:'军令', badge:'军', hint:'调兵、练兵、边防、征讨', forecast:'军心 +4，国帑 -18 万两，边镇服从 +2'},
    {id:'dip', label:'外交', badge:'外', hint:'遣使、和议、册封、贡市', forecast:'邻邦态度 +3，礼部负担 +1，风闻风险低'},
    {id:'eco', label:'经济', badge:'经', hint:'赋税、仓储、漕运、水利', forecast:'民心 +3，府库 -8 万两，地方执行波动'},
    {id:'oth', label:'其他', badge:'他', hint:'大赦、科举、营建、礼仪及非常处置', forecast:'皇威 +2，执行口径需再校验'}
  ];

  data.edictSuggestions = data.edictSuggestions || [
    {source:'御案时政', from:'辽饷缺口', text:'先拨京帑十八万两，令户部会同兵部核辽东军储，并查沿途耗费。', turn:'本回', tags:['军务','财赋','急']},
    {source:'百官奏疏', from:'孙承宗', text:'宁远、锦州军储渐空，请先安军心，再议边镇整训。', turn:'本回', tags:['辽东','军心']},
    {source:'近事', from:'江南漕报', text:'江南粮船滞缓，若严催恐伤民力，可改为分批入京。', turn:'上回', tags:['漕运','民情']}
  ];

  data.edictArchive = data.edictArchive || [
    {turn:'第 1 回合', title:'禁厂卫扰民', status:'已下发', target:'司礼监、都察院', effect:'皇权 +1，民心 +2'},
    {turn:'第 2 回合', title:'核辽东兵册', status:'执行中', target:'兵部、辽东巡抚', effect:'军队名册逐步补齐'},
    {turn:'第 2 回合', title:'江南漕运宽限', status:'留中', target:'户部、应天巡抚', effect:'待御案时政裁断'}
  ];

  data.playerActionHistory = data.playerActionHistory || [
    {turn:'第 2 回合', text:'召见孙承宗、王在晋问京营点验，又命内阁复核兵册。'},
    {turn:'第 2 回合', text:'夜阅辽东塘报，批示司礼监不得截留边镇急递。'},
    {turn:'第 1 回合', text:'御文华殿听讲，命翰林摘录祖宗边防旧制。'},
    {turn:'第 1 回合', text:'遣中使慰问皇后，询内廷用度与宫中风闻。'}
  ];

  function toast(text){
    if(typeof window.toastPreview === 'function') window.toastPreview(text);
    else console.log(text);
  }

  function chip(text, cls=''){
    return `<span class="tm-chip ${esc(cls)}">${esc(text)}</span>`;
  }

  function miniButton(text, onclick='', cls=''){
    return `<button class="tm-mini-btn ${esc(cls)}" ${onclick ? `onclick="${esc(onclick)}"` : ''}>${esc(text)}</button>`;
  }

  function showOverlay(id, html){
    installEdictStyles();
    if(typeof window.showBridgeOverlay === 'function'){
      return window.showBridgeOverlay(id, html);
    }
    const old = $(id);
    if(old) old.remove();
    const ov = document.createElement('div');
    ov.id = id;
    ov.className = 'tm-bridge-overlay show';
    ov.innerHTML = `<div class="tm-bridge-scrim"></div>${html}`;
    ov.addEventListener('click', event => {
      if(event.target === ov || event.target.matches('[data-close-bridge],.tm-bridge-scrim')){
        ov.remove();
      }
    });
    document.body.appendChild(ov);
    return ov;
  }

  function actionShell(kind, body){
    return `<section class="tm-bridge-panel tm-action-panel ${esc(kind)}-shell" role="dialog" aria-modal="true">
      <button class="tm-action-close tm-floating-close" data-close-bridge title="关闭">×</button>
      <div class="tm-action-body ${esc(kind)}">${body}</div>
    </section>`;
  }

  function edictPortraitFor(s){
    const key = `${s.from || ''}${s.source || ''}`;
    if(/袁崇焕|卢象升|辽|军|边/.test(key)) return 'img/portraits/ming-general-ai.png';
    if(/魏忠贤|司礼监|内廷|厂卫|阉/.test(key)) return 'img/portraits/ming-eunuch-ai.png';
    if(/张嫣|皇后|中宫/.test(key)) return 'img/portraits/ming-empress-ai.png';
    if(/朱由校|皇帝|陛下|御案/.test(key)) return 'img/portraits/ming-emperor-ai.png';
    if(/徐光启|清流|问对|学/.test(key)) return 'img/portraits/ming-scholar-ai.png';
    return 'img/portraits/ming-civil-ai.png';
  }

  function renderSuggestion(s, index){
    return `<article class="edict-sug-v2">
      <img class="edict-sug-portrait" src="${esc(edictPortraitFor(s))}" alt="">
      <div>
        <b>【${esc(s.source)}${s.from ? ' · ' + esc(s.from) : ''}】</b>
        <p>${esc(s.text || s.content || '')}</p>
        <div class="edict-sug-footer">
          <span class="tm-chip-row">${chip(s.turn,'green')}${(s.tags||[]).map(t => chip(t,t === '急' ? 'hot' : '')).join('')}</span>
          <button class="edict-sug-adopt" type="button" onclick="tmOpenEdictAdoptMenu(event,${index})">纳 入</button>
        </div>
      </div>
    </article>`;
  }

  function renderPolished(){
    if(!state.polished) return '';
    return `<section class="edict-polish-scroll">
      <div class="edict-polish-title">诏　书</div>
      <textarea id="tm-polished-edict" class="edict-polish-text">${esc(state.polished)}</textarea>
      <div class="edict-polish-seal"><div>皇 帝</div><div style="font-size:18px;">制宝</div><div>之 宝</div></div>
      <div class="edict-polish-actions">
        ${miniButton('重 新 润 色','tmPolishEdicts()')}
        ${miniButton('采 纳 修 订','tmApplyPolishedEdict()','green')}
        ${miniButton('颁 行 天 下','tmIssuePreviewEdict()','green')}
      </div>
    </section>`;
  }

  function renderPlayerAction(){
    const rows = (data.playerActionHistory || []).map(x => `<div class="edict-xingzhi-row"><span>${esc(x.turn)}</span><b>${esc(x.text)}</b></div>`).join('');
    return `<section class="edict-xingzhi">
      <div class="edict-xingzhi-head"><b>主 角 行 止</b><span>你这段时间做了什么，正式接入后写入起居注与回合推演语境</span></div>
      <textarea class="tm-textarea" id="tm-player-action" placeholder="如：召见某臣、校阅三军、微服私访、夜读史书、祖庙祭祀、宴请群臣……" oninput="tmSetPlayerAction(this.value)">${esc(state.playerAction || '')}</textarea>
      <div class="edict-xingzhi-history">${rows}</div>
    </section>`;
  }

  function renderCards(){
    return (data.edictCategories || []).map(c => {
      const val = state.edictDrafts[c.id] || '';
      return `<article class="edict-old-card">
        <div class="edict-old-card-head"><span class="edict-old-badge">${esc(c.badge)}</span><span><b>${esc(c.label)}</b><span>${esc(c.hint)}</span></span></div>
        <textarea class="tm-textarea" placeholder="在此草拟${esc(c.label)}，正式接入后写入旧诏令流程。" oninput="tmSetEdictDraft('${esc(c.id)}',this.value)">${esc(val)}</textarea>
        <div class="edict-old-forecast">${esc(c.forecast)}</div>
      </article>`;
    }).join('');
  }

  function renderArchive(){
    return (data.edictArchive || []).map(a => `<article class="edict-old-archive-card">
      <b>${esc(a.turn)} · ${esc(a.title)}</b>
      <p>${esc(a.status)} / ${esc(a.target)}</p>
      <p>${esc(a.effect)}</p>
    </article>`).join('');
  }

  function renderEdictPanel(){
    const suggestions = (data.edictSuggestions || []).map(renderSuggestion).join('');
    return `<section class="edict-old-panel">
      <aside class="edict-old-sug">
        <h3 class="edict-old-sug-title">议事清册 <small>${(data.edictSuggestions || []).length} 条</small></h3>
        <div class="edict-old-sug-list">${suggestions}</div>
      </aside>
      <main class="edict-old-main">
        <header class="edict-old-title"><span class="edict-old-seal">诏</span><strong>天子御笔</strong><span>奉天承运皇帝　诏曰</span></header>
        <section class="edict-old-cards">${renderCards()}</section>
        <div class="edict-old-bar">
          <div class="edict-old-bar-left"><span class="edict-old-label">文 风 选 择</span><select class="tm-select" id="tm-edict-style"><option>典雅骈文</option><option>简洁明快</option><option>华丽文藻</option><option>白话文言</option><option>军前急诏</option><option>内阁票拟</option><option>密旨口吻</option></select></div>
          <div class="tm-row-actions">${miniButton('有 司 润 色','tmPolishEdicts()')}${miniButton('生成草诏','tmIssuePreviewEdict()','green')}</div>
        </div>
        ${renderPolished()}
        ${renderPlayerAction()}
        <section class="edict-old-section">
          <h3 class="edict-old-section-title">既有诏令 <small>可追溯</small></h3>
          <div class="edict-old-archive">${renderArchive()}</div>
        </section>
      </main>
    </section>`;
  }

  function openZhao(){
    state.mode = 'edict';
    showOverlay('tm-action-edict-overlay', actionShell('edict', renderEdictPanel()));
  }

  function tmSetEdictDraft(id, value){
    state.edictDrafts[id] = value;
    state.edictCat = id;
  }

  function tmSetPlayerAction(value){
    state.playerAction = value;
  }

  function tmCloseEdictAdoptMenu(){
    document.getElementById('tm-edict-adopt-menu')?.remove();
    document.removeEventListener('click', tmCloseEdictAdoptMenu);
  }

  function tmOpenEdictAdoptMenu(event, index){
    installEdictStyles();
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    tmCloseEdictAdoptMenu();
    const btn = event?.currentTarget || event?.target;
    const rect = btn ? btn.getBoundingClientRect() : {left:120,bottom:120};
    const menu = document.createElement('div');
    menu.id = 'tm-edict-adopt-menu';
    menu.className = 'edict-adopt-menu';
    menu.style.left = `${Math.max(12, Math.min(window.innerWidth - 188, rect.left - 72))}px`;
    menu.style.top = `${Math.min(window.innerHeight - 205, Math.max(12, rect.bottom + 6))}px`;
    menu.innerHTML = `<div class="edict-adopt-menu-title">纳入哪个部分</div>${(data.edictCategories || []).map(c => `<button type="button" onclick="tmAdoptEdictSuggestion(${index},'${esc(c.id)}')"><i>${esc(c.badge)}</i><span>${esc(c.label)}</span></button>`).join('')}`;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', tmCloseEdictAdoptMenu), 0);
  }

  function tmAdoptEdictSuggestion(index, cat){
    const s = (data.edictSuggestions || [])[index];
    if(!s) return;
    state.edictCat = cat;
    const label = (data.edictCategories || []).find(c => c.id === cat)?.label || '诏令';
    state.edictDrafts[cat] = (state.edictDrafts[cat] ? state.edictDrafts[cat] + '\n\n' : '') + `〔${s.source || '建议'}${s.from ? ' · ' + s.from : ''}〕\n${s.text || s.content || ''}`;
    tmCloseEdictAdoptMenu();
    toast(`已纳入${label}`);
    openZhao();
  }

  function tmPolishEdicts(){
    const parts = (data.edictCategories || []).map(c => {
      const text = (state.edictDrafts[c.id] || '').trim();
      return text ? `【${c.label}】${text}` : '';
    }).filter(Boolean);
    const draft = parts.join('\n\n') || '辽饷事急，着户部会同兵部先拨银粮，以安边军。';
    const action = (state.playerAction || '').trim();
    state.polished = `奉天承运皇帝，诏曰：\n\n朕惟军国大计，系于民生边防，不可一日稽迟。今览诸司奏陈，辽东饷路、江南漕运、内廷外朝诸事并发，有司其各尽厥职，毋得推诿。\n\n${draft}\n\n${action ? '朕本回行止，亦令起居官据实记注：' + action + '\n\n' : ''}凡此诸条，着内阁票拟，户部、兵部、都察院会同奉行；有违慢、侵耗、壅蔽者，从重议处。布告中外，咸使闻知。`;
    openZhao();
  }

  function tmApplyPolishedEdict(){
    const polished = document.getElementById('tm-polished-edict')?.value || state.polished || '';
    state.edictDrafts[state.edictCat || 'pol'] = polished;
    state.polished = '';
    openZhao();
  }

  function tmIssuePreviewEdict(){
    toast('预览：草诏已生成，并会写入近事与史官实录。');
    if(window.tianmingPreviewNewsFeed?.ingest){
      window.tianmingPreviewNewsFeed.ingest({type:'诏令', seal:'诏', title:'新诏令草拟完成', tag:'御案', body:'诏令已进入下发与留档流程。', meta:['诏令','史官实录']});
    }
  }

  Object.assign(window, {
    openZhao,
    tmSetEdictDraft,
    tmSetPlayerAction,
    tmOpenEdictAdoptMenu,
    tmCloseEdictAdoptMenu,
    tmAdoptEdictSuggestion,
    tmPolishEdicts,
    tmApplyPolishedEdict,
    tmIssuePreviewEdict
  });
})();
