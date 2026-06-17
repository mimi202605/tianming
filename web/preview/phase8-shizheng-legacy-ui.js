(function(){
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch]));

  const fallbackIssues = [
    {
      id:'sz-liaodong',
      title:'辽东军饷告急',
      status:'pending',
      raisedTurn:3,
      raisedDate:'第三回合 · 仲春',
      category:'军务',
      severity:'急',
      affectedRegion:'辽东',
      description:'宁远、锦州仓储渐空，兵部请先拨银粮，以免边镇军心浮动。',
      narrative:'此事不只是一城一堡的军需，而是朝廷财计、边臣信用与辽东防线的连锁问题。',
      linkedChars:['孙承宗','袁崇焕','王在晋'],
      linkedFactions:['兵部','辽东军','户部'],
      longTermConsequences:{军心:'速拨可稳边镇军心。',财计:'动用内帑可加快执行，但会增加财政压力。'},
      historicalNote:'预览议题，来源于御案时政。'
    },
    {
      id:'sz-jiangnan',
      title:'江南织造与漕粮相逼',
      status:'pending',
      raisedTurn:3,
      raisedDate:'第三回合 · 仲春',
      category:'财赋',
      severity:'高',
      affectedRegion:'江南',
      description:'苏州、松江受织造定额与漕粮转运双重压力，商民对关卡盘剥已有怨言。',
      narrative:'江南仍能供给朝廷，但若层层加派，地方稳定与商税都会受损。',
      linkedChars:['毛一鹭','袁继咸'],
      linkedFactions:['江南士绅','户部'],
      longTermConsequences:{民情:'减轻定额可改善地方民情。',漕运:'短期缓征有助于稳定漕运。'}
    },
    {
      id:'sz-neiting',
      title:'内廷与言官互攻',
      status:'pending',
      raisedTurn:3,
      raisedDate:'第三回合 · 仲春',
      category:'朝局',
      severity:'警',
      affectedRegion:'京师',
      description:'司礼监与外朝言官因旧账和风闻互相攻讦，奏疏往来渐多。',
      narrative:'若皇帝不辨风闻与实证，皇权威断与外朝信任都会受到牵动。',
      linkedChars:['魏忠贤','张皇后','孙承宗'],
      linkedFactions:['司礼监','清流','阉党'],
      longTermConsequences:{皇权:'严断可短期增强皇威。',党争:'拖延会继续推高党争烈度。'}
    },
    {
      id:'sz-jingying',
      title:'京营点验暂留',
      status:'resolved',
      raisedTurn:2,
      resolvedTurn:3,
      raisedDate:'第二回合',
      resolvedDate:'第三回合',
      category:'军务',
      severity:'录',
      affectedRegion:'京师',
      description:'京营空额与器械账册不合，牵涉多衙门。',
      narrative:'因牵涉兵部、内廷与勋贵，暂交内阁拟票，后续会同点验。',
      chosenText:'留中，命内阁拟票，兵部会同复核。',
      linkedChars:['王在晋','魏忠贤'],
      linkedFactions:['京营','兵部','司礼监'],
      historicalNote:'已决事项仍可用于后续追踪。'
    }
  ];

  function installStyles(){
    if(document.getElementById('tm-shizheng-legacy-style')) return;
    const style = document.createElement('style');
    style.id = 'tm-shizheng-legacy-style';
    style.textContent = `
      .tm-sz-legacy-overlay{position:fixed;inset:0;background:rgba(18,12,6,.85);z-index:9998;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(3px);}
      .tm-sz-legacy-panel{width:min(92vw,1020px);max-height:78vh;display:flex;flex-direction:column;background:linear-gradient(180deg,#1e1610,#14100a);border:1px solid var(--gold-d,#8d6d33);border-radius:6px;box-shadow:0 8px 40px rgba(0,0,0,.70);overflow:hidden;color:var(--txt-l,#eadfbd);}
      .tm-sz-legacy-head{padding:.9rem 1.4rem;display:flex;align-items:center;gap:1rem;border-bottom:1px solid rgba(201,168,76,.20);background:linear-gradient(180deg,rgba(201,168,76,.06),transparent);}
      .tm-sz-legacy-back,.tm-sz-legacy-close,.tm-sz-legacy-action{background:transparent;border:1px solid var(--gold-d,#8d6d33);color:var(--gold,#d1ad62);cursor:pointer;border-radius:3px;font-family:"STKaiti","KaiTi",serif;}
      .tm-sz-legacy-back{padding:.35rem .9rem;font-size:.88rem;letter-spacing:.15em;}
      .tm-sz-legacy-close{width:1.9rem;height:1.9rem;font-size:.85rem;}
      .tm-sz-legacy-title{flex:1;text-align:center;font-size:1.25rem;letter-spacing:.70rem;color:var(--gold,#d1ad62);font-family:"STKaiti","KaiTi",serif;text-shadow:0 2px 8px rgba(201,168,76,.20);}
      .tm-sz-legacy-count{width:5rem;text-align:right;color:var(--txt-d,#9b8b68);font-size:.72rem;}
      .tm-sz-legacy-body{flex:1;overflow-y:auto;padding:1.1rem 1.4rem;scrollbar-width:thin;scrollbar-color:rgba(201,168,76,.4) transparent;}
      .tm-sz-legacy-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:.85rem;}
      .tm-sz-legacy-card{position:relative;min-height:116px;padding:.9rem 1.1rem .95rem;cursor:pointer;border-radius:4px;transition:transform .15s ease-out,box-shadow .15s ease-out;background:#f4e8cc;border:1px solid #c9a85f;}
      .tm-sz-legacy-card:hover{transform:translateY(-2px);box-shadow:0 4px 14px rgba(201,168,76,.25);}
      .tm-sz-legacy-card.resolved{background:#e8ddbf;border-color:#a39373;opacity:.78;}
      .tm-sz-legacy-card h3{margin:0 60px .3rem 0;font-weight:700;font-size:1rem;line-height:1.4;color:#3d2f1a;font-family:"STKaiti","KaiTi",serif;}
      .tm-sz-legacy-card.resolved h3{color:#6b5d47;}
      .tm-sz-legacy-date{font-size:.72rem;color:#8b7355;margin-bottom:.5rem;letter-spacing:.05em;}
      .tm-sz-legacy-card p{margin:0;font-size:.8rem;color:#5a4a32;line-height:1.65;font-family:"STKaiti","KaiTi",serif;}
      .tm-sz-legacy-card.resolved p{color:#8b7d68;}
      .tm-sz-legacy-badge{position:absolute;top:10px;right:10px;padding:2px 10px;border-radius:2px;font-size:.7rem;font-weight:bold;letter-spacing:.1em;transform:rotate(6deg);background:rgba(192,64,48,.08);border:1px solid rgba(192,64,48,.45);color:#a13c2e;}
      .tm-sz-legacy-card.resolved .tm-sz-legacy-badge{background:rgba(90,90,90,.08);border-color:rgba(90,90,90,.45);color:#6b6b6b;}
      .tm-sz-legacy-empty{text-align:center;padding:4rem 2rem;color:var(--txt-d,#9b8b68);font-size:.95rem;font-family:"STKaiti","KaiTi",serif;letter-spacing:.3em;}
      .tm-sz-legacy-detail{position:fixed;inset:0;background:rgba(15,10,5,.88);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);}
      .tm-sz-legacy-detail-panel{width:min(90vw,760px);max-height:82vh;display:flex;flex-direction:column;background:linear-gradient(180deg,#1e1610,#14100a);border:1px solid var(--gold-d,#8d6d33);border-radius:6px;box-shadow:0 10px 48px rgba(0,0,0,.75);overflow:hidden;color:var(--txt-l,#eadfbd);}
      .tm-sz-legacy-detail-scroll{flex:1;overflow-y:auto;padding:1.4rem 1.8rem 1.6rem;scrollbar-width:thin;scrollbar-color:rgba(201,168,76,.4) transparent;}
      .tm-sz-legacy-detail-title{text-align:center;margin-bottom:1.3rem;}
      .tm-sz-legacy-detail-title h3{margin:0 0 .5rem;font-size:1.55rem;font-weight:bold;color:var(--gold,#d1ad62);font-family:"STKaiti","KaiTi",serif;letter-spacing:.18em;text-shadow:0 2px 12px rgba(201,168,76,.20);}
      .tm-sz-legacy-meta{display:inline-flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:.6rem;color:var(--txt-d,#9b8b68);font-size:.8rem;}
      .tm-sz-legacy-status{padding:2px 10px;border-radius:2px;font-size:.72rem;font-weight:bold;letter-spacing:.1em;background:rgba(192,64,48,.12);border:1px solid rgba(192,64,48,.5);color:#c05030;}
      .tm-sz-legacy-status.resolved{background:rgba(120,120,120,.12);border-color:rgba(120,120,120,.5);color:#999;}
      .tm-sz-legacy-section{margin-bottom:1.2rem;}
      .tm-sz-legacy-section-title{font-size:.78rem;color:var(--gold,#d1ad62);letter-spacing:.28em;margin-bottom:.5rem;font-family:"STKaiti","KaiTi",serif;}
      .tm-sz-legacy-prose{font-size:.95rem;line-height:2.05;color:var(--txt-l,#eadfbd);text-align:justify;white-space:pre-wrap;font-family:"STKaiti","KaiTi",serif;letter-spacing:.02em;}
      .tm-sz-legacy-prime{padding:.8rem 1rem;background:rgba(201,168,76,.025);border-left:2px solid var(--gold-d,#8d6d33);}
      .tm-sz-legacy-box{background:rgba(201,168,76,.04);border:1px solid var(--gold-d,#8d6d33);border-radius:3px;padding:.8rem 1.1rem;}
      .tm-sz-legacy-chip{display:inline-block;padding:1px 8px;margin:2px 3px 2px 0;border-radius:2px;font-size:.82rem;line-height:1.9;background:rgba(201,168,76,.08);border:1px solid rgba(201,168,76,.25);color:var(--gold-l,#f0d68d);font-family:"STKaiti","KaiTi",serif;}
      .tm-sz-legacy-chip.red{background:rgba(192,64,48,.08);border-color:rgba(192,64,48,.25);color:var(--vermillion-300,#d56b55);}
      .tm-sz-legacy-note{font-size:.78rem;color:var(--ink-400,#8b8067);font-style:italic;line-height:1.85;border-left:2px solid rgba(201,168,76,.4);padding:.45rem .9rem;background:rgba(201,168,76,.025);font-family:"STKaiti","KaiTi",serif;}
      .tm-sz-legacy-foot{padding:.8rem 1.3rem;display:flex;justify-content:center;gap:1.2rem;border-top:1px solid rgba(201,168,76,.2);background:linear-gradient(180deg,transparent,rgba(201,168,76,.04));}
      .tm-sz-legacy-action{background:linear-gradient(135deg,#3d2f1a,#2a2010);border-color:var(--gold,#d1ad62);padding:.55rem 1.4rem;font-size:.92rem;letter-spacing:.28em;transition:all .2s;color:var(--gold,#d1ad62);}
      .tm-sz-legacy-action:hover{background:linear-gradient(135deg,rgba(201,168,76,.18),rgba(201,168,76,.08));color:#f0d77a;}
      @media (max-width:760px){
        .tm-sz-legacy-grid{grid-template-columns:1fr;}
        .tm-sz-legacy-panel{width:calc(100vw - 28px);}
        .tm-sz-legacy-title{letter-spacing:.28rem;}
        .tm-sz-legacy-count{display:none;}
        .tm-sz-legacy-detail-panel{width:calc(100vw - 28px);}
        .tm-sz-legacy-foot{flex-direction:column;}
      }
    `;
    document.head.appendChild(style);
  }

  function issues(){
    try {
      if(typeof window.previewShizhengIssues === 'function'){
        const local = window.previewShizhengIssues();
        if(Array.isArray(local) && local.length) return local;
      }
      const real = window.GM && Array.isArray(window.GM.currentIssues) ? window.GM.currentIssues : [];
      if(real.length) return real;
    } catch(_){}
    return fallbackIssues;
  }

  function isResolved(issue){
    return issue && (issue.status === 'resolved' || issue.resolved === true);
  }

  function issueDate(issue, resolved){
    if(resolved && issue.resolvedDate) return issue.resolvedDate;
    if(issue.raisedDate) return issue.raisedDate;
    const turn = resolved ? (issue.resolvedTurn || issue.raisedTurn || 1) : (issue.raisedTurn || 1);
    return typeof window.getTSText === 'function' ? window.getTSText(turn) : `第${turn}回合`;
  }

  function sortedIssues(){
    const all = issues().slice();
    const pending = all.filter(i => !isResolved(i)).sort((a,b) => (b.raisedTurn || 0) - (a.raisedTurn || 0));
    const resolved = all.filter(isResolved).sort((a,b) => (b.resolvedTurn || b.raisedTurn || 0) - (a.resolvedTurn || a.raisedTurn || 0));
    return {pending, resolved, all:[...pending, ...resolved]};
  }

  function card(issue){
    const resolved = isResolved(issue);
    const raw = String(issue.description || '');
    const desc = raw.length > 70 ? raw.slice(0,70) + '…' : raw;
    const id = esc(issue.id || '');
    return `<article class="tm-sz-legacy-card ${resolved ? 'resolved' : ''}" data-issue-id="${id}" onclick="_openShizhengDetail(this.dataset.issueId)">
      <span class="tm-sz-legacy-badge">${resolved ? '已解决' : '待解决'}</span>
      <h3>${esc(issue.title || '(未详)')}</h3>
      <div class="tm-sz-legacy-date">${esc(issueDate(issue, resolved))}</div>
      <p>${esc(desc)}</p>
    </article>`;
  }

  function closeShizhengTasks(){
    document.getElementById('shizheng-tasks-overlay')?.remove();
    document.getElementById('shizheng-task-detail')?.remove();
  }

  function openShizhengTasks(){
    installStyles();
    closeShizhengTasks();
    const {pending, resolved, all} = sortedIssues();
    const overlay = document.createElement('div');
    overlay.id = 'shizheng-tasks-overlay';
    overlay.className = 'tm-sz-legacy-overlay';
    overlay.addEventListener('click', event => {
      if(event.target === overlay) closeShizhengTasks();
    });
    overlay.innerHTML = `<section class="tm-sz-legacy-panel" role="dialog" aria-label="御案时政">
      <header class="tm-sz-legacy-head">
        <button class="tm-sz-legacy-back" type="button" onclick="closeShizhengTasks()">‹ 返 回</button>
        <div class="tm-sz-legacy-title">御 案 时 政</div>
        <div class="tm-sz-legacy-count"><span>${pending.length} 待 / ${resolved.length} 决</span></div>
      </header>
      <main class="tm-sz-legacy-body">
        ${all.length ? `<div class="tm-sz-legacy-grid">${all.map(card).join('')}</div>` : '<div class="tm-sz-legacy-empty">四海升平·暂无要务</div>'}
      </main>
    </section>`;
    document.body.appendChild(overlay);
  }

  function findIssue(issueId){
    return issues().find(issue => String(issue.id) === String(issueId));
  }

  function tagList(items, red){
    return (items || []).map(item => `<span class="tm-sz-legacy-chip ${red ? 'red' : ''}">${esc(item)}</span>`).join('');
  }

  function consequenceBlock(issue){
    if(!issue.longTermConsequences || typeof issue.longTermConsequences !== 'object') return '';
    const rows = Object.keys(issue.longTermConsequences).map(key => (
      `<div style="font-size:.82rem;color:var(--txt-s,#d7c9aa);line-height:1.85;margin-bottom:.2rem;font-family:'STKaiti','KaiTi',serif;"><b style="color:var(--gold-d,#b9924a);">${esc(key)}：</b>${esc(issue.longTermConsequences[key])}</div>`
    )).join('');
    return `<section class="tm-sz-legacy-section tm-sz-legacy-box">
      <div class="tm-sz-legacy-section-title">〔 风 势 推 演 〕</div>
      ${rows}
    </section>`;
  }

  function detailSections(issue){
    const people = tagList(issue.linkedChars || [], false);
    const factions = tagList(issue.linkedFactions || [], true);
    const relationGrid = (people || factions) ? `<section class="tm-sz-legacy-section" style="display:grid;grid-template-columns:${people && factions ? '1fr 1fr' : '1fr'};gap:.8rem;">
      ${people ? `<div><div class="tm-sz-legacy-section-title">关 涉 群 臣</div><div>${people}</div></div>` : ''}
      ${factions ? `<div><div class="tm-sz-legacy-section-title">牵 动 势 力</div><div>${factions}</div></div>` : ''}
    </section>` : '';

    return `
      <section class="tm-sz-legacy-section tm-sz-legacy-prime">
        <div class="tm-sz-legacy-prose">${esc(issue.description || '')}</div>
      </section>
      ${issue.narrative && issue.narrative !== issue.description ? `<section class="tm-sz-legacy-section">
        <div class="tm-sz-legacy-section-title">〔 详 情 奏 闻 〕</div>
        <div class="tm-sz-legacy-prose" style="font-size:.88rem;color:var(--txt-s,#d7c9aa);">${esc(issue.narrative)}</div>
      </section>` : ''}
      ${relationGrid}
      ${consequenceBlock(issue)}
      ${issue.historicalNote ? `<section class="tm-sz-legacy-section tm-sz-legacy-note">〔 史 馆 旧 案 〕 ${esc(issue.historicalNote)}</section>` : ''}
      ${issue.chosenText ? `<section class="tm-sz-legacy-section" style="font-size:.82rem;color:var(--celadon-400,#7eb8a7);line-height:1.8;padding:.5rem .9rem;background:rgba(106,154,127,.06);border:1px solid rgba(106,154,127,.30);border-radius:3px;font-family:'STKaiti','KaiTi',serif;">〔 陛 下 已 断 〕 ${esc(issue.chosenText)}</section>` : ''}
    `;
  }

  function openShizhengDetail(issueId){
    installStyles();
    const issue = findIssue(issueId);
    if(!issue){
      if(typeof window.toastPreview === 'function') window.toastPreview('议题已失效');
      return;
    }
    document.getElementById('shizheng-task-detail')?.remove();
    const resolved = isResolved(issue);
    const meta = [
      issueDate(issue, false),
      issue.category,
      issue.affectedRegion ? `影响·${issue.affectedRegion}` : '',
      issue.severity
    ].filter(Boolean);
    const overlay = document.createElement('div');
    overlay.id = 'shizheng-task-detail';
    overlay.className = 'tm-sz-legacy-detail';
    overlay.addEventListener('click', event => {
      if(event.target === overlay) overlay.remove();
    });
    overlay.innerHTML = `<section class="tm-sz-legacy-detail-panel" role="dialog" aria-label="时政详情">
      <header class="tm-sz-legacy-head">
        <button class="tm-sz-legacy-back" type="button" onclick="document.getElementById('shizheng-task-detail')?.remove()">‹ 返 回</button>
        <div style="flex:1"></div>
        <button class="tm-sz-legacy-close" type="button" onclick="document.getElementById('shizheng-task-detail')?.remove()">✕</button>
      </header>
      <main class="tm-sz-legacy-detail-scroll">
        <div class="tm-sz-legacy-detail-title">
          <h3>${esc(issue.title || '')}</h3>
          <div class="tm-sz-legacy-meta">
            ${meta.map(item => `<span>${esc(item)}</span>`).join('<span style="color:var(--gold-d,#8d6d33);">·</span>')}
            <span class="tm-sz-legacy-status ${resolved ? 'resolved' : ''}">${resolved ? '已解决' : '待解决'}</span>
          </div>
        </div>
        ${detailSections(issue)}
        ${resolved && issue.resolvedTurn ? `<div style="text-align:center;font-size:.8rem;color:var(--celadon-400,#7eb8a7);letter-spacing:.2em;margin:.6rem 0 .3rem;">· 于 ${esc(issue.resolvedDate || issueDate(issue, true))} 议决 ·</div>` : ''}
      </main>
      ${!resolved ? `<footer class="tm-sz-legacy-foot">
        <button class="tm-sz-legacy-action" type="button" onclick="_shizhengConvene('${esc(issue.id || '')}')">御 前 召 对 群 臣</button>
        <button class="tm-sz-legacy-action" type="button" onclick="_shizhengSecret('${esc(issue.id || '')}')">独 召 密 问</button>
      </footer>` : ''}
    </section>`;
    document.body.appendChild(overlay);
  }

  function toast(text){
    if(typeof window.toastPreview === 'function') window.toastPreview(text);
    else if(typeof window.tmActionToast === 'function') window.tmActionToast(text);
  }

  function prefillChaoyi(issue){
    window.setTimeout(() => {
      const input = document.getElementById('tmrp-chaoyi-topic');
      if(input) input.value = `${issue?.title || '时政议题'}${issue?.description ? ' · ' + String(issue.description).slice(0, 60) : ''}`;
    }, 120);
  }

  function shizhengConvene(issueId){
    const issue = findIssue(issueId);
    closeShizhengTasks();
    if(typeof window.tmPreviewOpenRightPanel === 'function'){
      window.tmPreviewOpenRightPanel('issue');
      if(typeof window.tmPreviewRightSetTab === 'function') window.tmPreviewRightSetTab('issue','chaoyi');
      prefillChaoyi(issue);
      toast(`预览：已把“${issue?.title || '时政议题'}”送入御前召对/朝议入口`);
    }else if(typeof window.openChaoyi === 'function'){
      window.openChaoyi();
    }
  }

  function shizhengSecret(issueId){
    const issue = findIssue(issueId);
    closeShizhengTasks();
    if(typeof window.tmPreviewOpenRightPanel === 'function'){
      window.tmPreviewOpenRightPanel('issue');
      if(typeof window.tmPreviewRightSetTab === 'function') window.tmPreviewRightSetTab('issue','wendui');
      if(typeof window.tmPreviewSetWenduiMode === 'function') window.tmPreviewSetWenduiMode('private');
      toast(`预览：已进入“${issue?.title || '时政议题'}”的独召密问入口`);
    }else if(typeof window.openMiZhaoPicker === 'function'){
      window.openMiZhaoPicker(issueId);
    }
  }

  window.closeShizhengTasks = closeShizhengTasks;
  window.openShizheng = openShizhengTasks;
  window.openShizhengTasks = openShizhengTasks;
  window.openYuanShiZheng = openShizhengTasks;
  window.openYueAn = openShizhengTasks;
  window._openShizhengDetail = openShizhengDetail;
  window._shizhengConvene = shizhengConvene;
  window._shizhengSecret = shizhengSecret;
})();
