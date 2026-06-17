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
  Object.assign(state, {
    mode: state.mode || 'edict',
    edictCat: state.edictCat || 'pol',
    edictDrafts: state.edictDrafts || {},
    memorialFilter: state.memorialFilter || 'all',
    letterTarget: state.letterTarget || 'yuanchonghuan',
    letterFilter: state.letterFilter || 'all',
    letterSearch: state.letterSearch || '',
    recordTab: state.recordTab || 'shiji',
    recordQuery: state.recordQuery || '',
    recordTypeFilter: state.recordTypeFilter || '全部',
    qijuCat: state.qijuCat || '全部',
    qijuSort: state.qijuSort || 'recent',
    jishiSource: state.jishiSource || '全部',
    jishiView: state.jishiView || 'time',
    biannianCat: state.biannianCat || '全部',
    playerAction: state.playerAction || '与兵部尚书孙承宗于文华殿议辽饷，又召内阁问江南漕运。夜览边报至三更，命司礼监明日呈厂卫风闻册。'
  });

  const data = window.PREVIEW_ACTION_DATA = window.PREVIEW_ACTION_DATA || {
    edictCategories: [
      {id:'pol', label:'政令', badge:'政', hint:'官制、任免、抚谕、禁约', forecast:'皇权 +2，士林疑惧 +1，执行难度中'},
      {id:'mil', label:'军令', badge:'军', hint:'调兵、练兵、边防、征讨', forecast:'军心 +4，国帑 -18 万两，边镇服从 +2'},
      {id:'dip', label:'外交', badge:'外', hint:'遣使、和议、册封、贡市', forecast:'邻邦态度 +3，礼部负担 +1，风闻风险低'},
      {id:'eco', label:'经济', badge:'经', hint:'赋税、仓储、漕运、水利', forecast:'民心 +3，府库 -8 万两，地方执行波动'},
      {id:'oth', label:'其他', badge:'他', hint:'大赦、科举、营建、礼仪及非常处置', forecast:'皇威 +2，执行口径需再校验'}
    ],
    edictSuggestions: [
      {source:'御案时政', from:'辽饷缺口', text:'先拨京帑十八万两，令户部会同兵部核辽东军储，并查沿途耗费。', turn:'本回', tags:['军务','财赋','急']},
      {source:'百官奏疏', from:'孙承宗', text:'宁远、锦州军储渐空，请先安军心，再议边镇整训。', turn:'本回', tags:['辽东','军心']},
      {source:'近事', from:'江南漕报', text:'江南粮船滞缓，若严催恐伤民力，可改为分批入京。', turn:'上回', tags:['漕运','民情']}
    ],
    edictArchive: [
      {turn:'第 1 回合', title:'禁厂卫扰民', status:'已下发', target:'司礼监、都察院', effect:'皇权 +1，民心 +2'},
      {turn:'第 2 回合', title:'核辽东兵册', status:'执行中', target:'兵部、辽东巡抚', effect:'军队名册逐步补齐'},
      {turn:'第 2 回合', title:'江南漕运宽限', status:'留中', target:'户部、应天巡抚', effect:'待御案时政裁断'}
    ],
    playerActionHistory: [
      {turn:'第 2 回合', text:'召见孙承宗、王在晋问京营点验，又命内阁复核兵册。'},
      {turn:'第 2 回合', text:'夜阅辽东塘报，批示司礼监不得截留边镇急递。'},
      {turn:'第 1 回合', text:'御文华殿听讲，命翰林摘录祖宗边防旧制。'},
      {turn:'第 1 回合', text:'遣中使慰问皇后，询内廷用度与宫中风闻。'}
    ],
    memorialTransit: [
      {from:'辽东', office:'兵部塘报', type:'急递', eta:'三日', body:'宁远营储粮仅支二十余日。'},
      {from:'江南', office:'户部漕司', type:'常递', eta:'七日', body:'粮船入京迟缓，船户多有怨声。'}
    ],
    memorials: [
      {id:'m1', sender:'孙承宗', office:'兵部尚书', type:'军务', subtype:'辽饷', urgent:true, status:'pending', tags:['辽东','军心'], body:'辽东军储告急，请先拨银粮，以安宁远、锦州诸营。若迟一回合，士气恐动。'},
      {id:'m2', sender:'袁崇焕', office:'辽东巡抚', type:'边务', subtype:'守城', urgent:true, status:'review', tags:['宁远','火器'], body:'火器药铅可支一旬，登莱若迟，边堡先乱。臣请许便宜催调。'},
      {id:'m3', sender:'毛一鹭', office:'苏州知府', type:'财赋', subtype:'织造', urgent:false, status:'held', tags:['江南','民力'], body:'织造与漕粮并催，富户隐匿，贫民逃散，请暂宽一月。'},
      {id:'m4', sender:'魏忠贤', office:'司礼监', type:'风闻', subtype:'党争', urgent:false, status:'pending', tags:['内廷','东林'], body:'言官挟辽饷事攻讦内廷，臣请下厂卫访查幕后结党。'},
      {id:'m5', sender:'王在晋', office:'京师总督', type:'军务', subtype:'京营', urgent:false, status:'done', tags:['京营'], body:'京营器械多虚，已点验三营，请准修整。', reply:'准依所请，三日具册。', decisionType:'准奏'}
    ],
    letterPeople: [
      {id:'yuanchonghuan', name:'袁崇焕', role:'辽东巡抚', region:'辽东', face:'袁', flags:['未读','军务']},
      {id:'sunchengzong', name:'孙承宗', role:'兵部尚书', region:'京师', face:'孙', flags:['在京','可召']},
      {id:'zhangyan', name:'张嫣', role:'皇后', region:'中宫', face:'张', flags:['内廷']},
      {id:'weizhongxian', name:'魏忠贤', role:'司礼监掌印', region:'内廷', face:'魏', flags:['风闻','截获']},
      {id:'maoyilu', name:'毛一鹭', role:'苏州知府', region:'江南', face:'毛', flags:['民情']},
      {id:'lidaiwen', name:'李待问', role:'广东巡抚', region:'岭南', face:'李', flags:['海防']}
    ],
    letters: {
      yuanchonghuan: [
        {dir:'in', type:'密门', date:'本回', state:'未读', urgency:'急递', cipher:'阴符', mode:'驿递', body:'药铅将尽，军心未乱而饷心已乱。臣不敢饰辞，请速定拨饷之令。'},
        {dir:'out', type:'慰问', date:'上回', state:'在途', urgency:'加急', cipher:'不加密', mode:'普通信使', body:'卿宜先安诸营，朝廷已议辽饷。'}
      ],
      sunchengzong: [
        {dir:'in', type:'奏询', date:'本回', state:'已阅', urgency:'常递', cipher:'不加密', mode:'内阁转呈', body:'先饷后兵，臣以为今日急务。'}
      ],
      weizhongxian: [
        {dir:'in', type:'风闻', date:'本回', state:'可疑', urgency:'常递', cipher:'不加密', mode:'内廷递送', body:'外廷有人借辽饷攻内库，恐非为国。'}
      ]
    },
    routeAlerts: [
      {region:'辽东', level:'紧', desc:'山海关至宁远可通，急递七日可达。'},
      {region:'江南', level:'缓', desc:'漕船北上滞缓，常递可靠。'},
      {region:'岭南', level:'远', desc:'海路可快，但截获风险较高。'}
    ],
    intercepted: [
      {from:'东厂番役', to:'司礼监', type:'截闻', risk:'中', body:'言官私下传看辽饷亏空册。'}
    ],
    shiji: [
      {year:'熙宁三年', turn:'第 3 回合', type:'军务', title:'辽饷告急', summary:'辽东军储不足，兵部请先拨饷，户部请核沿途耗费。', tags:['辽东','军心'], deltas:['军心 +2','国帑 -18 万']},
      {year:'熙宁三年', turn:'第 3 回合', type:'党争', title:'内阁与司礼监互攻', summary:'司礼监以风闻弹压外廷，词臣借辽饷追问内帑旧账。', tags:['党争','皇权'], deltas:['皇权 +1','士林疑惧 +2']},
      {year:'熙宁三年', turn:'第 2 回合', type:'灾异', title:'江北水势未退', summary:'漕船延滞，地方先发常平仓赈济，请朝廷准折征。', tags:['水患','漕粮'], deltas:['民心 +1','粮仓 -5']}
    ],
    qiju: [
      {turn:'第 3 回合', date:'春二月己巳', cat:'诏令', title:'谕户部核拨辽饷', body:'上命户部三日内具辽饷实数，毋以旧牍相推。', annot:'可追踪户部反馈。'},
      {turn:'第 3 回合', date:'春二月己巳', cat:'奏疏', title:'孙承宗言辽饷', body:'兵部尚书孙承宗请先议饷，后议兵。', annot:''},
      {turn:'第 3 回合', date:'春二月庚午', cat:'鸿雁', title:'密门赴宁远', body:'遣使持密旨问袁崇焕军中浮言。', annot:'在途 6 日。'},
      {turn:'第 2 回合', date:'春正月癸卯', cat:'朝议', title:'京营点验之议', body:'王在晋请会同三方点验京营军械簿册。', annot:'留中。'}
    ],
    jishi: [
      {source:'常朝', person:'孙承宗', topic:'辽饷先后', importance:'高', mood:'持重', dialogue:'臣以为兵事急，而饷事更急。无饷而责将，是驱人入险。', outcome:'形成军令草诏建议', tags:['军务','朝议']},
      {source:'问对·私下', person:'张嫣', topic:'宫中风闻', importance:'中', mood:'谨慎', dialogue:'宫中言语未必皆实，然有人借言语试探圣意。', outcome:'纳入内廷风险记忆', tags:['内廷','人物']},
      {source:'鸿雁', person:'袁崇焕', topic:'宁远火器', importance:'高', mood:'急切', dialogue:'药铅可支一旬，登莱若迟，臣恐边堡先乱。', outcome:'触发辽东饷路近事', tags:['书信','辽东']}
    ],
    biannian: [
      {year:'熙宁三年', season:'春', date:'二月己巳', cat:'军事', title:'辽饷线索延续', body:'辽东、户部、内帑三线牵连，形成长期军饷问题。', tags:['辽东','国帑']},
      {year:'熙宁三年', season:'春', date:'二月庚午', cat:'政事', title:'司礼监与外廷争权', body:'厂卫风闻与言官奏疏互相牵制。', tags:['党争','内廷']}
    ],
    longAffairs: [
      {type:'军务', title:'辽东军饷', actor:'兵部 / 户部', stage:'核拨', elapsed:12, remaining:8, progress:60, priority:'高', stakeholders:['孙承宗','袁崇焕','户部']},
      {type:'财赋', title:'江南漕运', actor:'户部 / 江南地方', stage:'催运', elapsed:9, remaining:16, progress:42, priority:'中', stakeholders:['毛一鹭','户部']}
    ]
  };

  function installRestoreStyles(){
    if(document.getElementById('tm-rich-ui-restore-style')) return;
    const style = document.createElement('style');
    style.id = 'tm-rich-ui-restore-style';
    style.textContent = `
      .tm-person-rich-panel{left:52px;top:64px;width:min(1200px,calc(100vw - 128px));height:min(800px,calc(100vh - 94px));}
      .tm-person-rich-panel>.tm-action-close.tm-floating-close{position:absolute;top:14px;right:16px;z-index:5;}
      .tm-person-rich{height:100%;display:grid;grid-template-columns:286px minmax(0,1fr) 292px;gap:12px;padding:14px;box-sizing:border-box;background:radial-gradient(ellipse at 30% 0,rgba(201,160,69,.11),transparent 38%),linear-gradient(180deg,rgba(26,20,15,.98),rgba(10,8,7,.97));font-family:"STKaiti","KaiTi",serif;color:#eadfbd;}
      .tm-person-pane{min-height:0;overflow:auto;border:1px solid rgba(201,160,69,.18);background:rgba(0,0,0,.18);scrollbar-color:rgba(201,160,69,.48) rgba(0,0,0,.22);}
      .tm-person-left{padding:12px;}
      .tm-person-search{display:grid;gap:7px;margin-bottom:10px;}
      .tm-person-tabs{display:flex;gap:6px;margin-bottom:10px;}
      .tm-person-tabs button{height:28px;flex:1;border:1px solid rgba(201,160,69,.22);background:rgba(0,0,0,.22);color:rgba(232,220,187,.68);cursor:pointer;}
      .tm-person-tabs button.active{color:#f2d98d;border-color:rgba(201,160,69,.54);background:rgba(98,54,30,.28);}
      .tm-person-list{display:flex;flex-direction:column;gap:7px;}
      .tm-person-row{display:grid;grid-template-columns:42px minmax(0,1fr) auto;gap:8px;align-items:center;border:1px solid rgba(201,160,69,.16);background:rgba(255,245,210,.035);color:#eadfbd;padding:7px;cursor:pointer;text-align:left;}
      .tm-person-row.active{border-color:rgba(239,201,116,.58);box-shadow:inset 3px 0 rgba(180,54,37,.68);background:rgba(96,45,28,.26);}
      .tm-person-row img{width:40px;height:48px;object-fit:cover;border:1px solid rgba(201,160,69,.32);filter:saturate(.9);}
      .tm-person-row b{display:block;color:#f2d98d;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .tm-person-row span{display:block;margin-top:3px;color:rgba(224,211,171,.56);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .tm-person-main{padding:16px;display:grid;grid-template-rows:auto minmax(0,1fr);gap:12px;}
      .tm-person-head{display:grid;grid-template-columns:138px minmax(0,1fr);gap:15px;align-items:start;border-bottom:1px solid rgba(201,160,69,.18);padding-bottom:12px;}
      .tm-person-portrait{width:132px;height:176px;object-fit:cover;border:1px solid rgba(201,160,69,.45);box-shadow:0 10px 24px rgba(0,0,0,.36);}
      .tm-person-title h2{margin:0;color:#f4dc96;font-size:27px;letter-spacing:.12em;font-weight:500;}
      .tm-person-title p{margin:6px 0;color:rgba(232,220,187,.68);font-size:12px;line-height:1.6;}
      .tm-person-scroll{min-height:0;overflow:auto;padding-right:6px;scrollbar-color:rgba(201,160,69,.48) rgba(0,0,0,.22);}
      .tm-person-section{margin-bottom:12px;padding:11px;border:1px solid rgba(201,160,69,.14);background:rgba(255,245,210,.035);}
      .tm-person-section h3{margin:0 0 8px;color:#f0d68d;font-size:15px;letter-spacing:.16em;font-weight:500;}
      .tm-person-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
      .tm-person-line{display:grid;grid-template-columns:72px minmax(0,1fr);gap:8px;border-bottom:1px solid rgba(201,160,69,.08);padding:6px 0;font-size:12px;}
      .tm-person-line span{color:rgba(224,211,171,.52);}
      .tm-person-line b{color:#eadfbd;font-weight:400;}
      .tm-person-bar{display:grid;grid-template-columns:42px minmax(0,1fr) 30px;gap:7px;align-items:center;margin:7px 0;color:rgba(224,211,171,.62);font-size:11px;}
      .tm-person-bar i{height:6px;border:1px solid rgba(201,160,69,.15);background:rgba(255,255,255,.07);}
      .tm-person-bar i:before{content:"";display:block;height:100%;width:var(--v);background:linear-gradient(90deg,#7eb8a7,#d4be7a,#c95340);}
      .tm-person-right{padding:12px;display:flex;flex-direction:column;gap:10px;}
      .tm-person-card{border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.16);padding:10px;}
      .tm-person-card b{display:block;color:#f2d98d;font-size:13px;}
      .tm-person-card p{margin:6px 0 0;color:rgba(232,220,187,.68);font-size:12px;line-height:1.58;}
      .tm-person-actions{display:flex;flex-wrap:wrap;gap:7px;}
      .tm-person-actions button{min-height:28px;border:1px solid rgba(201,160,69,.24);background:rgba(18,13,10,.78);color:#eadfbd;padding:4px 9px;cursor:pointer;font-family:inherit;}
      .tm-person-actions button.primary{border-color:rgba(213,103,73,.52);background:linear-gradient(180deg,rgba(126,45,32,.86),rgba(58,25,18,.92));color:#ffe1ac;}
      .tm-action-panel .tm-action-body.edict,.tm-action-panel .tm-action-body.memorial,.tm-action-panel .tm-action-body.letter,.tm-action-panel .tm-action-body.records{height:100%;}
      .edict-sug-v2{display:grid;grid-template-columns:44px minmax(0,1fr);gap:9px;position:relative;padding:9px;border:1px solid rgba(201,160,69,.18);background:linear-gradient(90deg,rgba(126,64,36,.12),rgba(0,0,0,.12));}
      .edict-sug-v2+.edict-sug-v2{margin-top:8px;}
      .edict-sug-portrait{width:42px;height:50px;object-fit:cover;border:1px solid rgba(201,160,69,.35);background:#16100b;filter:saturate(.88) contrast(1.02);}
      .edict-sug-v2 b{display:block;color:#f2d98d;font-size:12px;line-height:1.35;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .edict-sug-v2 p{margin:4px 0 7px;color:rgba(238,227,194,.76);font-size:12px;line-height:1.55;}
      .edict-sug-v2 .tm-chip-row{margin-bottom:7px;}
      .edict-sug-footer{display:flex;align-items:center;justify-content:space-between;gap:8px;}
      .edict-sug-adopt{min-height:25px;padding:0 10px;border:1px solid rgba(213,176,95,.42);background:linear-gradient(180deg,rgba(80,44,25,.88),rgba(25,18,13,.92));color:#f0d68d;cursor:pointer;font-family:"STKaiti","KaiTi",serif;letter-spacing:.12em;}
      .edict-adopt-menu{position:fixed;z-index:99999;min-width:168px;padding:6px;border:1px solid rgba(201,160,69,.34);border-radius:5px;background:linear-gradient(180deg,rgba(33,24,17,.98),rgba(12,9,7,.98));box-shadow:0 16px 36px rgba(0,0,0,.58);font-family:"STKaiti","KaiTi",serif;}
      .edict-adopt-menu-title{padding:4px 7px 7px;color:rgba(232,220,187,.58);font-size:11px;letter-spacing:.14em;border-bottom:1px solid rgba(201,160,69,.16);margin-bottom:5px;}
      .edict-adopt-menu button{display:grid;grid-template-columns:24px minmax(0,1fr);gap:7px;align-items:center;width:100%;min-height:30px;text-align:left;border:0;background:transparent;color:#eadfbd;cursor:pointer;font-family:inherit;padding:4px 7px;}
      .edict-adopt-menu button:hover{background:rgba(201,160,69,.10);}
      .edict-adopt-menu i{display:grid;place-items:center;width:22px;height:22px;border-radius:50%;font-style:normal;border:1px solid rgba(201,160,69,.30);color:#f2d98d;background:rgba(0,0,0,.24);}
      .edict-polish-scroll{position:relative;margin-top:14px;padding:22px 26px 18px;border:1px solid rgba(129,84,38,.42);background:linear-gradient(180deg,rgba(244,226,178,.95),rgba(213,184,125,.94));color:#2d1c10;box-shadow:inset 0 0 0 1px rgba(255,252,220,.45),0 12px 28px rgba(0,0,0,.36);}
      .edict-polish-scroll::before,.edict-polish-scroll::after{content:"";position:absolute;left:14px;right:14px;height:8px;border-radius:8px;background:linear-gradient(90deg,#5a321d,#9b6a36,#5a321d);box-shadow:0 2px 5px rgba(0,0,0,.35);}
      .edict-polish-scroll::before{top:-5px;}
      .edict-polish-scroll::after{bottom:-5px;}
      .edict-polish-title{text-align:center;margin-bottom:12px;color:#7a1f17;font-size:20px;letter-spacing:.42em;font-family:"STKaiti","KaiTi",serif;}
      .edict-polish-text{width:100%;min-height:210px;box-sizing:border-box;border:0;outline:0;resize:vertical;background:transparent;color:#2d1c10;font-family:"STKaiti","KaiTi",serif;font-size:15px;line-height:1.95;white-space:pre-wrap;}
      .edict-polish-seal{position:absolute;right:28px;bottom:64px;width:70px;height:70px;border:3px solid rgba(143,31,21,.75);color:rgba(143,31,21,.86);display:grid;place-items:center;text-align:center;font-size:12px;line-height:1.15;transform:rotate(-8deg);font-weight:700;}
      .edict-polish-actions{display:flex;justify-content:center;gap:9px;margin-top:14px;}
      .edict-xingzhi{margin-top:16px;border:1px solid rgba(201,160,69,.18);background:rgba(255,245,210,.035);padding:12px;}
      .edict-xingzhi-head{display:flex;align-items:baseline;gap:8px;margin-bottom:8px;font-family:"STKaiti","KaiTi",serif;}
      .edict-xingzhi-head b{color:#f2d98d;letter-spacing:.22em;font-size:15px;font-weight:500;}
      .edict-xingzhi-head span{color:rgba(224,211,171,.55);font-size:11px;}
      .edict-xingzhi textarea{min-height:92px;}
      .edict-xingzhi-history{margin-top:10px;display:grid;gap:6px;max-height:140px;overflow:auto;scrollbar-color:rgba(201,160,69,.48) rgba(0,0,0,.22);}
      .edict-xingzhi-row{display:grid;grid-template-columns:74px minmax(0,1fr);gap:8px;padding:6px 8px;border:1px solid rgba(201,160,69,.10);background:rgba(0,0,0,.12);font-size:12px;line-height:1.55;color:rgba(232,220,187,.72);}
      .edict-xingzhi-row span{color:#d5b05f;}
      .tm-var-card{display:block;width:100%;text-align:left;font-family:inherit;cursor:pointer;}
      .tm-var-card[hidden]{display:none!important;}
      .tm-var-card:hover{border-color:rgba(238,211,139,.52);background:linear-gradient(90deg,rgba(126,184,167,.10),transparent 46%),rgba(255,245,210,.07);}
      .tm-var-card.core{border-left:2px solid rgba(222,67,48,.54);}
      .tm-var-card.scenario{border-left:2px solid rgba(126,184,167,.48);}
      .tm-var-card.runtime{border-left:2px solid rgba(184,154,83,.48);}
      .tm-allvars-section{margin-bottom:15px;}
      .tm-allvars-hint{display:flex;justify-content:space-between;gap:12px;color:rgba(224,211,171,.58);font-size:11px;line-height:1.5;margin-top:8px;}
      .tm-var-section{margin-bottom:12px;border:1px solid rgba(201,160,69,.15);background:rgba(255,245,210,.04);border-radius:5px;padding:10px 11px;}
      .tm-var-section h3{margin:0 0 8px;color:#f0d68d;font-size:13px;letter-spacing:.12em;font-weight:500;}
      .tm-var-subsection{padding:8px 0;border-top:1px solid rgba(201,160,69,.09);}
      .tm-var-subsection:first-of-type{padding-top:0;border-top:0;}
      .tm-var-subsection h4{margin:0 0 6px;color:rgba(213,176,95,.86);font-size:12px;letter-spacing:.10em;font-weight:500;}
      .tm-var-lines{display:grid;gap:6px;}
      .tm-var-line{display:grid;grid-template-columns:96px minmax(0,1fr);gap:9px;font-size:12px;line-height:1.55;border-bottom:1px solid rgba(201,160,69,.08);padding-bottom:5px;}
      .tm-var-line:last-child{border-bottom:0;padding-bottom:0;}
      .tm-var-line span{color:rgba(224,211,171,.55);}
      .tm-var-line b{color:#f1e4bd;font-weight:400;}
      .tm-var-note{margin:8px 0 0;color:rgba(232,220,187,.68);font-size:12px;line-height:1.62;}
      .tm-var-action-row{display:flex;flex-wrap:wrap;gap:8px;margin-top:9px;}
      .tm-var-action-row .tm-var-action{padding:0 10px;font-family:inherit;}
      .tm-wt-toolbar{display:flex;gap:6px;flex-wrap:wrap;padding:10px 12px;border-bottom:1px solid rgba(201,160,69,.13);background:rgba(0,0,0,.14);}
      .tm-wt-toolbar .tm-wentian-cat{height:25px;}
      .tm-wt-counts{margin-left:auto;color:rgba(224,211,171,.55);font-size:11px;align-self:center;white-space:nowrap;}
      .tm-wentian-msg.directive{align-self:flex-start;border-left:2px solid rgba(126,184,167,.54);background:rgba(39,84,76,.14);}
      .tm-wentian-msg.ai{align-self:flex-start;border-left:2px solid rgba(201,160,69,.42);}
      .tm-wentian-msg .text ul{margin:5px 0 0 18px;padding:0;}
      .tm-wentian-msg .text li{margin:2px 0;}
      .tm-wt-empty{padding:8px 9px;color:rgba(224,211,171,.55);font-size:12px;border:1px dashed rgba(201,160,69,.18);border-radius:4px;}
    `;
    document.head.appendChild(style);
  }

  function toast(text){
    if(typeof window.toastPreview === 'function') window.toastPreview(text);
    else console.log(text);
  }

  function showOverlay(id, html){
    installRestoreStyles();
    if(typeof window.showBridgeOverlay === 'function'){
      return window.showBridgeOverlay(id, html);
    }
    const old = $(id);
    if(old) old.remove();
    const ov = document.createElement('div');
    ov.id = id;
    ov.className = 'tm-bridge-overlay show';
    ov.innerHTML = `<div class="tm-bridge-scrim"></div>${html}`;
    ov.addEventListener('click', ev => {
      if(ev.target === ov || ev.target.closest('[data-close-bridge]')) ov.remove();
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

  function chip(text, cls=''){
    return `<span class="tm-chip ${esc(cls)}">${esc(text)}</span>`;
  }

  function miniButton(text, onclick='', cls=''){
    return `<button class="tm-mini-btn ${esc(cls)}" ${onclick ? `onclick="${esc(onclick)}"` : ''}>${esc(text)}</button>`;
  }

  function setText(selector, text){
    const el = document.querySelector(selector);
    if(el) el.textContent = text;
  }

  function restoreVisibleLabels(){
    const labels = [
      ['#zhao-btn','御案','撰写诏书','起草政令','撰写诏书 · 起草政令'],
      ['#zhao-btn-2','内阁','百官奏疏','御览奏报','百官奏疏 · 御览奏报'],
      ['#zhao-btn-3','驿传','鸿雁传书','遣使通信','鸿雁传书 · 遣使通信'],
      ['#zhao-btn-4','史馆','史官实录','回合档案','史官实录 · 回合档案']
    ];
    labels.forEach(([sel,k,t,s,title]) => {
      const btn = document.querySelector(sel);
      if(!btn) return;
      btn.title = title;
      btn.setAttribute('aria-label', t);
      const parts = btn.querySelectorAll('.zb-action-copy span');
      if(parts[0]) parts[0].textContent = k;
      if(parts[1]) parts[1].textContent = t;
      if(parts[2]) parts[2].textContent = s;
    });
    setText('#shizheng-btn .sz-title','御案时政');
    setText('#shizheng-btn .sz-sub','朝政中枢');
    setText('#tm-event-scope-label','最近三回合');
    const rail = [
      ['ol','纲','纲纪总览'],
      ['issue','政','政务问对'],
      ['policy','策','国策规划'],
      ['office','臣','百官人事'],
      ['army','军','军务边防'],
      ['map','图','舆图政区'],
      ['finance','户','户部财计'],
      ['rumor','闻','风闻情报'],
      ['archive','史','史档邸报']
    ];
    rail.forEach(([slot,text,label]) => {
      const btn = document.querySelector(`.tm-rc-icon[data-slot="${slot}"]`);
      if(!btn) return;
      const count = btn.querySelector('.tm-rc-count');
      btn.childNodes.forEach(node => {
        if(node.nodeType === Node.TEXT_NODE) node.textContent = '';
      });
      btn.insertBefore(document.createTextNode(text), count || null);
      btn.setAttribute('aria-label', label);
      btn.title = label;
    });
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

  function renderEdictSuggestion(s, i){
    return `<article class="edict-sug-v2">
      <img class="edict-sug-portrait" src="${esc(edictPortraitFor(s))}" alt="">
      <div>
        <b>【${esc(s.source)}${s.from ? ' · ' + esc(s.from) : ''}】</b>
        <p>${esc(s.text || s.content || '')}</p>
        <div class="edict-sug-footer">
          <span class="tm-chip-row">${chip(s.turn,'green')}${(s.tags||[]).map(t=>chip(t,t==='急'?'hot':'')).join('')}</span>
          <button class="edict-sug-adopt" type="button" onclick="tmOpenEdictAdoptMenu(event,${i})">纳 入</button>
        </div>
      </div>
    </article>`;
  }

  function renderPolishedEdict(){
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

  function renderPlayerActionSection(){
    const rows = (data.playerActionHistory || []).map(x => `<div class="edict-xingzhi-row"><span>${esc(x.turn)}</span><b>${esc(x.text)}</b></div>`).join('');
    return `<section class="edict-xingzhi">
      <div class="edict-xingzhi-head"><b>主 角 行 止</b><span>你这段时间做了什么，正式接入后写入起居注与回合推演语境</span></div>
      <textarea class="tm-textarea" id="tm-player-action" placeholder="如：召见某臣、校阅三军、微服私访、夜读史书、祖庙祭祀、宴请群臣……" oninput="tmSetPlayerAction(this.value)">${esc(state.playerAction || '')}</textarea>
      <div class="edict-xingzhi-history">${rows}</div>
    </section>`;
  }

  function renderEdictPanel(){
    const suggestions = data.edictSuggestions.map(renderEdictSuggestion).join('');
    const cards = data.edictCategories.map(c => {
      const val = state.edictDrafts[c.id] || '';
      return `<article class="edict-old-card">
        <div class="edict-old-card-head"><span class="edict-old-badge">${esc(c.badge)}</span><span><b>${esc(c.label)}</b><span>${esc(c.hint)}</span></span></div>
        <textarea class="tm-textarea" placeholder="在此草拟${esc(c.label)}，正式接入后写入旧诏令流程。" oninput="tmSetEdictDraft('${esc(c.id)}',this.value)">${esc(val)}</textarea>
        <div class="edict-old-forecast">${esc(c.forecast)}</div>
      </article>`;
    }).join('');
    const archive = data.edictArchive.map(a => `<article class="edict-old-archive-card">
      <b>${esc(a.turn)} · ${esc(a.title)}</b>
      <p>${esc(a.status)} / ${esc(a.target)}</p>
      <p>${esc(a.effect)}</p>
    </article>`).join('');
    return `<section class="edict-old-panel">
      <aside class="edict-old-sug">
        <h3 class="edict-old-sug-title">议事清册 <small>${data.edictSuggestions.length} 条</small></h3>
        <div class="edict-old-sug-list">${suggestions}</div>
      </aside>
      <main class="edict-old-main">
        <header class="edict-old-title"><span class="edict-old-seal">诏</span><strong>天子御笔</strong><span>奉天承运皇帝　诏曰</span></header>
        <section class="edict-old-cards">${cards}</section>
        <div class="edict-old-bar">
          <div class="edict-old-bar-left"><span class="edict-old-label">文 风 选 择</span><select class="tm-select" id="tm-edict-style"><option>典雅骈文</option><option>简洁明快</option><option>华丽文藻</option><option>白话文言</option><option>军前急诏</option><option>内阁票拟</option><option>密旨口吻</option></select></div>
          <div class="tm-row-actions">${miniButton('有 司 润 色','tmPolishEdicts()')}${miniButton('生成草诏','tmIssuePreviewEdict()','green')}</div>
        </div>
        ${renderPolishedEdict()}
        ${renderPlayerActionSection()}
        <section class="edict-old-section">
          <h3 class="edict-old-section-title">既有诏令 <small>可追溯</small></h3>
          <div class="edict-old-archive">${archive}</div>
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
    if(event){
      event.preventDefault();
      event.stopPropagation();
    }
    tmCloseEdictAdoptMenu();
    const btn = event?.currentTarget || event?.target;
    const rect = btn ? btn.getBoundingClientRect() : {left:120,bottom:120,top:120};
    const menu = document.createElement('div');
    menu.id = 'tm-edict-adopt-menu';
    menu.className = 'edict-adopt-menu';
    const top = Math.min(window.innerHeight - 205, Math.max(12, rect.bottom + 6));
    menu.style.left = `${Math.max(12, Math.min(window.innerWidth - 188, rect.left - 72))}px`;
    menu.style.top = `${top}px`;
    menu.innerHTML = `<div class="edict-adopt-menu-title">纳入哪个部分</div>${data.edictCategories.map(c => `<button type="button" onclick="tmAdoptEdictSuggestion(${index},'${esc(c.id)}')"><i>${esc(c.badge)}</i><span>${esc(c.label)}</span></button>`).join('')}`;
    document.body.appendChild(menu);
    setTimeout(() => document.addEventListener('click', tmCloseEdictAdoptMenu), 0);
  }

  function tmAdoptEdictSuggestion(index, cat){
    const s = data.edictSuggestions[index];
    if(!s) return;
    state.edictCat = cat;
    const label = data.edictCategories.find(c => c.id === cat)?.label || '诏令';
    state.edictDrafts[cat] = (state.edictDrafts[cat] ? state.edictDrafts[cat] + '\n\n' : '') + `〔${s.source || '建议'}${s.from ? ' · ' + s.from : ''}〕\n${s.text || s.content || ''}`;
    tmCloseEdictAdoptMenu();
    toast(`已纳入${label}`);
    openZhao();
  }

  function tmPolishEdicts(){
    const parts = data.edictCategories.map(c => {
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

  function memorialGroupKey(m){
    if(m.status === 'done') return 'done';
    if(m.status === 'held') return 'held';
    if(m.status === 'review') return 'review';
    if(m.urgent) return 'urgent';
    return 'pending';
  }

  function memorialMatches(filter, m){
    if(filter === 'all') return true;
    if(filter === 'urgent') return !!m.urgent && memorialGroupKey(m) !== 'done';
    return memorialGroupKey(m) === filter;
  }

  function statusLabel(status){
    return ({pending:'待批', held:'留中', review:'复核', done:'已批'}[status] || status || '未定');
  }

  function renderMemorialCard(m){
    const actions = [
      ['approve','准奏','green'],
      ['reject','驳回','primary'],
      ['annotate','批示',''],
      ['refer','转有司',''],
      ['debate','发朝议',''],
      ['hold','留中',''],
      ['excerpt','摘入诏令',''],
      ['summon','传召问对','']
    ];
    return `<article class="memorial-card-v4 ${esc(memorialGroupKey(m))}">
      <div class="memorial-card-head-v4">
        <span class="memorial-avatar-v4">${esc((m.sender||'臣').slice(0,1))}</span>
        <span><b>${esc(m.sender)} · ${esc(m.office)}</b><span>${esc(m.type)} / ${esc(m.subtype)} · ${statusLabel(m.status)}</span></span>
        <span class="tm-chip-row">${m.urgent?chip('急奏','hot'):''}${chip(statusLabel(m.status),m.status==='done'?'green':'')}${(m.tags||[]).map(t=>chip(t)).join('')}</span>
      </div>
      <div class="memorial-body-v4">${esc(m.body)}</div>
      <div class="memorial-reply-v4">
        <textarea class="tm-textarea" placeholder="朱批理由、转交意见或留中说明。" oninput="tmSetMemorialReply('${esc(m.id)}',this.value)">${esc(m.reply||'')}</textarea>
        <span class="tm-chip-row">${chip(m.decisionType||'未定')}</span>
      </div>
      <div class="memorial-actions-v4">${actions.map(([key,label,cls])=>`<button class="${esc(cls)}" onclick="tmMemorialAction('${esc(m.id)}','${esc(key)}')">${esc(label)}</button>`).join('')}</div>
    </article>`;
  }

  function renderMemorialPanel(){
    const filters = [
      ['all','全部奏疏','旧奏疏总览'],
      ['urgent','急奏待批','红签优先'],
      ['pending','百官启奏','常规待批'],
      ['held','留中之折','御前暂存'],
      ['review','复核疑奏','转交建议'],
      ['done','已批档案','朱批归档']
    ];
    const side = filters.map(([key,label,sub]) => {
      const count = data.memorials.filter(m=>memorialMatches(key,m)).length;
      return `<button class="${state.memorialFilter===key?'active':''}" onclick="tmSetMemorialFilter('${key}')"><i>奏</i><span><b>${esc(label)}</b><span>${esc(sub)}</span></span>${chip(String(count),count?'green':'')}</button>`;
    }).join('');
    const transit = data.memorialTransit.map(t=>`<div class="memorial-side-note"><b>${esc(t.from)} · ${esc(t.office)}</b><p>${esc(t.type)} / ${esc(t.eta)}<br>${esc(t.body)}</p></div>`).join('');
    const groupMeta = [
      ['urgent','急奏待批','旧 UI 中红签急奏，优先于常规折件。'],
      ['pending','百官启奏','可准奏、驳回、批示、转交有司或发朝议。'],
      ['held','留中之折','暂不下发，保留御前判断与后续回合。'],
      ['review','复核疑奏','含批示意见、转交有司、发廷议、疑奏传召。'],
      ['done','已批档案','已形成朱批，可追踪回函与承办。']
    ];
    const groups = groupMeta.map(([key,title,sub]) => {
      const rows = data.memorials.filter(m => memorialMatches(state.memorialFilter,m) && memorialGroupKey(m) === key);
      if(!rows.length) return '';
      return `<section class="memorial-group-v4"><h3 class="memorial-group-title-v4"><span>${esc(title)}</span><small>${rows.length} 件 · ${esc(sub)}</small></h3>${rows.map(renderMemorialCard).join('')}</section>`;
    }).join('');
    const openCount = data.memorials.filter(m=>m.status!=='done').length;
    return `<section class="memorial-office-v4">
      <aside class="memorial-cases-v4">
        <div class="tm-panel-v4-title"><span class="seal">奏</span><span><b>朱批案牍</b><span>急奏 / 留中 / 转交 / 廷议</span></span></div>
        <div class="memorial-filter-v4">${side}</div>
        <div class="memorial-side-note"><b>旧 UI 动作保留</b><p>准奏、驳回、批示意见、转交有司、发朝议、留中、摘入诏令、传召问对。</p></div>
        <h3 class="tm-roster-group" style="margin-top:12px">在途奏疏</h3>
        ${transit}
      </aside>
      <main class="memorial-paper-v4">
        <header class="memorial-paper-head-v4"><span><h2>百官奏疏待览</h2><p>承接旧奏疏标签页：先分拨，再朱批，再写入回合结算与近事。</p></span><span class="tm-chip-row">${chip('本回 '+openCount+' 件','green')}${chip('急 '+data.memorials.filter(m=>m.urgent).length,'hot')}</span></header>
        <div class="tm-stat-strip v4">
          <div class="tm-stat"><span>待批</span><b>${data.memorials.filter(m=>m.status==='pending').length}</b></div>
          <div class="tm-stat"><span>急奏</span><b>${data.memorials.filter(m=>m.urgent&&m.status!=='done').length}</b></div>
          <div class="tm-stat"><span>留中</span><b>${data.memorials.filter(m=>m.status==='held').length}</b></div>
          <div class="tm-stat"><span>复核</span><b>${data.memorials.filter(m=>memorialGroupKey(m)==='review').length}</b></div>
          <div class="tm-stat"><span>已批</span><b>${data.memorials.filter(m=>memorialGroupKey(m)==='done').length}</b></div>
        </div>
        ${groups || '<div class="records-card-v4"><b>无匹配奏疏</b><p>当前筛选下没有待览折件。</p></div>'}
      </main>
    </section>`;
  }

  function openYueZou(){
    state.mode = 'memorial';
    showOverlay('tm-action-memorial-overlay', actionShell('memorial', renderMemorialPanel()));
  }

  function tmSetMemorialFilter(filter){
    state.memorialFilter = filter;
    openYueZou();
  }

  function tmSetMemorialReply(id, value){
    const m = data.memorials.find(x=>x.id===id);
    if(m) m.reply = value;
  }

  function tmMemorialAction(id, action){
    const m = data.memorials.find(x=>x.id===id);
    if(!m) return;
    const defaults = {
      approve:['done','准奏','准奏，着有司速行，并具回奏。'],
      reject:['done','驳回','所奏未允，仍照旧制。'],
      annotate:['review','批示','再具明细，毋得空言。'],
      refer:['review','转有司','转交有司会核，限期具报。'],
      debate:['review','发朝议','发朝议，令诸臣集议后复奏。'],
      hold:['held','留中','留中，候朕再断。']
    };
    if(defaults[action]){
      const [status, decision, reply] = defaults[action];
      m.status = status;
      m.decisionType = decision;
      m.reply = m.reply || reply;
    }
    if(action === 'excerpt'){
      data.edictSuggestions.unshift({source:'奏疏摘入', from:m.sender, text:m.body.slice(0,72)+'……', turn:'本回', tags:[m.type,m.subtype]});
      toast('已摘入诏令议事清单。');
    }
    if(action === 'summon'){
      toast('预览：转入右侧「政」的问对 / 朝议流程。');
      window.tmPreviewOpenRightPanel?.('issue');
    }
    if(action !== 'excerpt' && window.tianmingPreviewNewsFeed?.ingest){
      window.tianmingPreviewNewsFeed.ingest({type:'奏疏', seal:'奏', title:`${m.sender}奏疏已${m.decisionType||'处置'}`, tag:m.type, body:m.reply||m.body.slice(0,42), meta:['奏疏',statusLabel(m.status)]});
    }
    openYueZou();
  }

  function letterStateClass(stateText){
    if(/拦截|截获|失约|阻断|可疑/.test(stateText||'')) return 'lost intercepted';
    if(/在途|追回|核验/.test(stateText||'')) return 'transit';
    return '';
  }

  function renderLetterPanel(){
    const q = (state.letterSearch||'').trim().toLowerCase();
    const groups = {};
    data.letterPeople.filter(p => {
      const hay = [p.name,p.role,p.region,(p.flags||[]).join(' ')].join(' ').toLowerCase();
      return !q || hay.includes(q);
    }).forEach(p => {(groups[p.region]||(groups[p.region]=[])).push(p);});
    const roster = Object.keys(groups).map(region => `<div><h4 class="hy-region-v4">${esc(region)}</h4>${groups[region].map(p => `<button class="hy-person-v4 ${state.letterTarget===p.id?'active':''}" onclick="tmSelectLetterTarget('${esc(p.id)}')"><span class="hy-face-v4">${esc(p.face||p.name.slice(0,1))}</span><span><b>${esc(p.name)}</b><span>${esc(p.role)}</span></span><span class="tm-chip-row">${(p.flags||[]).slice(0,2).map(f=>chip(f,/未读|阻断|截获/.test(f)?'hot':'green')).join('')}</span></button>`).join('')}</div>`).join('');
    const target = data.letterPeople.find(p=>p.id===state.letterTarget) || data.letterPeople[0];
    const raw = (data.letters[target.id]||[]).map((l,idx)=>Object.assign({_idx:idx},l));
    const letters = raw.filter(l => {
      const f = state.letterFilter;
      if(f === 'all') return true;
      if(f === 'unread') return /未读|新函/.test(l.state);
      if(f === 'road') return /在途|追回|核验/.test(l.state);
      if(f === 'lost') return /失约|拦截|截获|阻断|可疑/.test(l.state);
      if(f === 'star') return !!l.star;
      return true;
    });
    const filterBtns = [['all','全部'],['unread','未读'],['road','在途'],['lost','失约/截获'],['star','星标']].map(([key,label])=>`<button class="${state.letterFilter===key?'active':''}" onclick="tmSetLetterFilter('${key}')">${esc(label)}</button>`).join('');
    const route = data.routeAlerts.map(r=>`${r.region}：${r.level}，${r.desc}`).join('　');
    const thread = letters.length ? letters.map(l => `<article class="hy-message-v4 ${l.dir==='out'?'out':'in'} ${letterStateClass(l.state)}">
      <b>${esc(l.dir==='out'?'御前发出':'来函')} · ${esc(l.type)} · ${esc(l.date)} ${l.star?'★':''}</b>
      <p>${esc(l.body)}</p>
      <div class="tm-chip-row">${chip(l.state,/未读|拦截|失约|可疑/.test(l.state)?'hot':'green')}${chip(l.urgency||'普通驿递')}${chip(l.cipher||'不加密')}${chip(l.mode||'普通信使')}</div>
      <div class="hy-actions-v4">
        ${l.dir==='out'&&/在途/.test(l.state)?`<button onclick="tmLetterAction('${target.id}',${l._idx},'recall')">追回</button>`:''}
        ${/拦截|失约|可疑/.test(l.state)?`<button onclick="tmLetterAction('${target.id}',${l._idx},'secret')">重发·密使</button><button onclick="tmLetterAction('${target.id}',${l._idx},'multi')">重发·多路加急</button>`:''}
        <button onclick="tmLetterAction('${target.id}',${l._idx},'verify')">遣使核实</button>
        <button onclick="tmLetterAction('${target.id}',${l._idx},'reply')">回书</button>
        <button onclick="tmLetterExcerpt('${target.id}',${l._idx})">摘入</button>
        <button onclick="tmLetterAction('${target.id}',${l._idx},'star')">${l.star?'取消星标':'星标'}</button>
      </div>
    </article>`).join('') : `<article class="hy-message-v4"><b>尚无书信往来</b><p>可在右侧拟信。正式接入时沿用旧鸿雁传书的递送、截获、延误和回函逻辑。</p></article>`;
    const intercepted = data.intercepted.map(x=>`<article class="hy-message-v4 intercepted"><b>${esc(x.from)} 至 ${esc(x.to)} · ${esc(x.type)}</b><p>${esc(x.body)}</p><div class="tm-chip-row">${chip('风险 '+x.risk,x.risk==='高'?'hot':'')}</div></article>`).join('');
    return `<section class="hy-office-v4">
      <aside class="hy-roster-v4"><div class="tm-panel-v4-title"><span class="seal">雁</span><span><b>鸿雁驿簿</b><span>地域分组 / 群发 / 未读</span></span></div><div class="hy-search-v4"><input class="tm-input" placeholder="检索姓名、官职、党派、地点" value="${esc(state.letterSearch||'')}" oninput="tmSetLetterSearch(this.value)"></div><button class="tm-mini-btn" style="width:100%;margin-bottom:8px" onclick="tmToggleLetterMulti()">${state.letterMultiMode?'群发：同地域':'群发'}</button>${roster||'<div class="tm-empty">无匹配人物</div>'}</aside>
      <main class="hy-thread-v4"><div class="hy-route-v4">${esc(route||'驿路平稳，暂无阻断。')}</div><div class="hy-contact-head-v4"><span class="portrait">${esc(target.face||target.name.slice(0,1))}</span><span><b>${esc(target.name)}</b><span>${esc(target.role)} / ${esc(target.region)}</span></span><span class="tm-chip-row">${(target.flags||[]).map(f=>chip(f,/未读|阻断/.test(f)?'hot':'green')).join('')}</span></div><div class="hy-filterbar-v4">${filterBtns}</div>${thread}<section class="hy-intercept-v4"><h3 class="tm-roster-group">截获通信</h3>${intercepted}</section></main>
      <aside class="hy-compose-v4"><div class="tm-panel-v4-title"><span class="seal">函</span><span><b>拟写书信</b><span>类型 / 缓急 / 加密 / 信使</span></span></div><label><span>书信类型</span><select class="tm-select" id="tm-letter-type"><option>密门</option><option>征调令</option><option>问安函</option><option>私函</option><option>檄文</option></select></label><label><span>驿递缓急</span><select class="tm-select" id="tm-letter-urgency"><option>普通驿递（日行五十里）</option><option>加急驿递（日行三百里）</option><option>八百里加急</option></select></label><label><span>加密方式</span><select class="tm-select" id="tm-letter-cipher"><option>不加密</option><option>阴符（暗号体系）</option><option>阴书（拆分三路）</option><option>蜡丸密函</option></select></label><label><span>信使方式</span><select class="tm-select" id="tm-letter-mode"><option>普通信使</option><option>多路信使（降低截获）</option><option>密使（不走驿站）</option></select></label><textarea id="tm-letter-body" class="tm-textarea" style="height:150px" placeholder="写给${esc(target.name)}的书信内容。"></textarea><div class="tm-row-actions"><button class="tm-action-primary" onclick="tmSendPreviewLetter()">遣使</button><button class="tm-action-ghost" onclick="toastPreview('预览：正式接入时打开旧鸿雁信使选择')">选密使</button></div><div class="memorial-side-note"><b>路程预估</b><p>${esc(target.region)}：普通约 12 日，加急约 7 日；密使降低截获，但可能延迟回函。</p></div></aside>
    </section>`;
  }

  function openHongyan(){
    state.mode = 'letter';
    showOverlay('tm-action-letter-overlay', actionShell('letter', renderLetterPanel()));
  }

  function tmSelectLetterTarget(id){ state.letterTarget = id; openHongyan(); }
  function tmSetLetterFilter(filter){ state.letterFilter = filter; openHongyan(); }
  function tmSetLetterSearch(value){ state.letterSearch = value; clearTimeout(state._letterSearchTimer); state._letterSearchTimer = setTimeout(openHongyan, 180); }
  function tmToggleLetterMulti(){ state.letterMultiMode = !state.letterMultiMode; openHongyan(); }

  function tmSendPreviewLetter(){
    const target = data.letterPeople.find(p=>p.id===state.letterTarget);
    if(!target) return;
    const body = $('tm-letter-body')?.value.trim();
    if(!body){ toast('书信正文为空。'); return; }
    const type = $('tm-letter-type')?.value || '密门';
    const urgency = $('tm-letter-urgency')?.value || '普通驿递';
    const cipher = $('tm-letter-cipher')?.value || '不加密';
    const mode = $('tm-letter-mode')?.value || '普通信使';
    const recipients = state.letterMultiMode ? data.letterPeople.filter(p=>p.region===target.region) : [target];
    recipients.forEach(r => {
      (data.letters[r.id]||(data.letters[r.id]=[])).push({dir:'out',type,date:'本回',state:'在途',urgency,cipher,mode,body});
    });
    toast(`已遣使送往 ${recipients.map(r=>r.name).join('、')}。`);
    openHongyan();
  }

  function tmLetterAction(targetId, index, action){
    const rows = data.letters[targetId] || [];
    const l = rows[index];
    if(!l) return;
    if(action === 'star') l.star = !l.star;
    if(action === 'recall') l.state = '追回中';
    if(action === 'verify') l.state = '核验中';
    if(action === 'secret' || action === 'multi'){
      rows.push({dir:'out', type:l.type||'密门', date:'本回', state:'在途', urgency:action==='multi'?'八百里加急':'加急驿递', cipher:'蜡丸密函', mode:action==='secret'?'密使':'多路信使', body:'重发：'+(l.body||'')});
    }
    openHongyan();
  }

  function tmLetterExcerpt(targetId, index){
    const target = data.letterPeople.find(p=>p.id===targetId);
    const rows = data.letters[targetId] || [];
    const l = rows[index];
    if(target && l){
      data.edictSuggestions.unshift({source:'鸿雁摘入', from:target.name, text:(l.body||'').slice(0,72)+'……', turn:'本回', tags:['鸿雁',l.type||'书信']});
      toast('已摘入诏令议事清单。');
    }
  }

  function groupBy(rows, fn){
    return rows.reduce((out,row) => {
      const key = fn(row);
      (out[key]||(out[key]=[])).push(row);
      return out;
    }, {});
  }

  function recordNeedle(){ return (state.recordQuery||'').trim().toLowerCase(); }
  function recordMatch(row){
    const q = recordNeedle();
    return !q || Object.values(row).flat().join(' ').toLowerCase().includes(q);
  }

  function renderRecordsPanel(){
    const tab = state.recordTab || 'shiji';
    const counts = {
      shiji:data.shiji.length,
      qiju:data.qiju.length,
      jishi:data.jishi.length,
      biannian:data.biannian.length + data.longAffairs.length
    };
    const tabs = [['shiji','史记','回合本纪'],['qiju','实录','起居注'],['jishi','纪事','人物事件'],['biannian','编年','长期事势']].map(([key,label,sub]) => `<button class="records-tab-v4 ${tab===key?'active':''}" onclick="tmSetRecordTab('${key}')"><b>${esc(label)}</b><span>${esc(sub)}</span><em>${counts[key]||0}</em></button>`).join('');
    const titles = {
      shiji:['史记本纪','回合结果、年度分组、变量变化'],
      qiju:['实录','诏令、奏疏、朝议、鸿雁与御批'],
      jishi:['纪事本末','按时间、人物、事类追踪问对与事件'],
      biannian:['编年纪事','长期事势、项目进度与永久史册']
    };
    const renderer = {shiji:renderShiji, qiju:renderQiju, jishi:renderJishi, biannian:renderBiannian}[tab] || renderShiji;
    return `<section class="records-cabinet-v4">
      <aside class="records-spine-v4"><div class="tm-panel-v4-title"><span class="seal">史</span><span><b>史官实录</b><span>四类档案</span></span></div>${tabs}<button class="tm-mini-btn" style="width:100%;margin-top:8px" onclick="tmRecordExportToast()">导出</button></aside>
      <main class="records-paper-v4"><header class="records-paper-head-v4"><span><h2>${titles[tab][0]}</h2><p>${titles[tab][1]}。预览页先恢复旧史记、实录、纪事、编年的结构。</p></span><span class="tm-chip-row">${chip('本回','green')}${chip('可搜索')}</span></header><div class="records-toolbar-v4"><input class="tm-input" style="max-width:286px" placeholder="搜索日期、人物、事类、对话" value="${esc(state.recordQuery||'')}" oninput="tmRememberRecordQuery(this.value)"><button onclick="openShilu()">刷新筛选</button></div>${renderer()}</main>
    </section>`;
  }

  function openShilu(){
    state.mode = 'records';
    showOverlay('tm-action-records-overlay', actionShell('records', renderRecordsPanel()));
  }

  function renderShiji(){
    const types = ['全部','军务','党争','灾异','人事'];
    const rows = data.shiji.filter(recordMatch).filter(r=>state.recordTypeFilter==='全部'||r.type===state.recordTypeFilter);
    const buttons = types.map(t=>`<button class="${state.recordTypeFilter===t?'active':''}" onclick="tmSetRecordFilter('recordTypeFilter','${t}')">${esc(t)}</button>`).join('');
    const groups = groupBy(rows,r=>r.year);
    const body = Object.keys(groups).map(year => `<section class="records-section-v4"><h3 class="records-section-title-v4"><span>${esc(year)}</span><small>${groups[year].length} 条</small></h3><div class="records-grid-v4">${groups[year].map(r=>`<article class="records-card-v4"><b>${esc(r.turn)} · ${esc(r.type)} · ${esc(r.title)}</b><p>${esc(r.summary)}</p><div class="tm-chip-row">${(r.tags||[]).map(t=>chip(t)).join('')}${(r.deltas||[]).map(d=>chip(d,/-/.test(d)?'hot':'green')).join('')}</div><div class="records-card-actions"><button onclick="toastPreview('预览：打开该回合结果详情')">展阅回合</button><button onclick="toastPreview('预览：已摘录史记摘要')">摘录</button></div></article>`).join('')}</div></section>`).join('');
    return `<div class="tm-stat-strip v4"><div class="tm-stat"><span>史记条目</span><b>${data.shiji.length}</b></div><div class="tm-stat"><span>当前显示</span><b>${rows.length}</b></div><div class="tm-stat"><span>军务</span><b>${data.shiji.filter(x=>x.type==='军务').length}</b></div><div class="tm-stat"><span>党争</span><b>${data.shiji.filter(x=>x.type==='党争').length}</b></div><div class="tm-stat"><span>可回溯</span><b>是</b></div></div><div class="records-toolbar-v4">${buttons}</div>${body||'<div class="records-card-v4"><b>无匹配史记</b><p>调整搜索或类型筛选后再试。</p></div>'}`;
  }

  function renderQiju(){
    const cats = ['全部','诏令','奏疏','朝议','鸿雁','人事'];
    let rows = data.qiju.filter(recordMatch).filter(r=>state.qijuCat==='全部'||r.cat===state.qijuCat);
    rows = rows.slice().sort((a,b)=>state.qijuSort==='old'?String(a.turn).localeCompare(String(b.turn)):String(b.turn).localeCompare(String(a.turn)));
    const buttons = cats.map(c=>`<button class="${state.qijuCat===c?'active':''}" onclick="tmSetRecordFilter('qijuCat','${c}')">${esc(c)}</button>`).join('');
    const groups = groupBy(rows,r=>r.turn);
    const body = Object.keys(groups).map(turn => `<section class="records-section-v4"><h3 class="records-section-title-v4"><span>${esc(turn)}</span><small>按日列注</small></h3>${groups[turn].map(r=>`<article class="records-card-v4"><b>${esc(r.date)} · ${esc(r.cat)} · ${esc(r.title)}</b><p>${esc(r.body)}</p><div class="tm-chip-row">${chip(r.cat,r.cat==='诏令'?'green':'')}${r.annot?chip('御批','hot'):chip('未批')}</div>${r.annot?`<p>御批：${esc(r.annot)}</p>`:''}<div class="records-card-actions"><button onclick="toastPreview('预览：添加御批')">御批</button><button onclick="toastPreview('预览：展开实录详情')">展阅</button></div></article>`).join('')}</section>`).join('');
    return `<div class="tm-stat-strip v4"><div class="tm-stat"><span>总录</span><b>${data.qiju.length}</b></div><div class="tm-stat"><span>近日</span><b>${data.qiju.filter(x=>x.turn==='第 3 回合').length}</b></div><div class="tm-stat"><span>诏令</span><b>${data.qiju.filter(x=>x.cat==='诏令').length}</b></div><div class="tm-stat"><span>御批</span><b>${data.qiju.filter(x=>x.annot).length}</b></div><div class="tm-stat"><span>显示</span><b>${rows.length}</b></div></div><div class="records-toolbar-v4">${buttons}<button onclick="tmSetRecordFilter('qijuSort','${state.qijuSort==='old'?'recent':'old'}')">${state.qijuSort==='old'?'旧日→':'近日→'}</button></div>${body||'<div class="records-card-v4"><b>无匹配实录</b><p>调整搜索或类别筛选后再试。</p></div>'}`;
  }

  function renderJishi(){
    const sources = ['全部','常朝','问对·私下','奏疏','鸿雁'];
    const rows = data.jishi.filter(recordMatch).filter(r=>state.jishiSource==='全部'||r.source===state.jishiSource);
    const sourceBtns = sources.map(s=>`<button class="${state.jishiSource===s?'active':''}" onclick="tmSetRecordFilter('jishiSource','${s}')">${esc(s)}</button>`).join('');
    const viewBtns = [['time','按时间'],['char','按人物'],['type','按事类']].map(([key,label])=>`<button class="${state.jishiView===key?'active':''}" onclick="tmSetJishiView('${key}')">${esc(label)}</button>`).join('');
    const grouped = groupBy(rows,r=>state.jishiView==='char'?r.person:(state.jishiView==='type'?r.source:'第 3 回合'));
    const body = Object.keys(grouped).map(group=>`<section class="records-section-v4"><h3 class="records-section-title-v4"><span>${esc(group)}</span><small>${grouped[group].length} 条</small></h3><div class="records-grid-v4">${grouped[group].map(r=>`<article class="records-card-v4"><b>${esc(r.source)} · ${esc(r.person)} · ${esc(r.topic)}</b><p>${esc(r.dialogue)}</p><div class="tm-chip-row">${chip('重要度 '+r.importance,r.importance==='高'?'hot':'')}${chip(r.mood)}${(r.tags||[]).map(t=>chip(t)).join('')}</div><p>结果：${esc(r.outcome)}</p><div class="records-card-actions"><button onclick="toastPreview('预览：已星标纪事')">星标</button><button onclick="toastPreview('预览：展开对话原文')">展开原文</button></div></article>`).join('')}</div></section>`).join('');
    return `<div class="tm-stat-strip v4"><div class="tm-stat"><span>纪事</span><b>${data.jishi.length}</b></div><div class="tm-stat"><span>高重要</span><b>${data.jishi.filter(x=>x.importance==='高').length}</b></div><div class="tm-stat"><span>人物</span><b>${new Set(data.jishi.map(x=>x.person)).size}</b></div><div class="tm-stat"><span>来源</span><b>${new Set(data.jishi.map(x=>x.source)).size}</b></div><div class="tm-stat"><span>显示</span><b>${rows.length}</b></div></div><div class="records-toolbar-v4">${viewBtns}</div><div class="records-source-legend-v4">${sourceBtns}</div>${body||'<div class="records-card-v4"><b>无匹配纪事</b><p>调整搜索、人物或来源筛选后再试。</p></div>'}`;
  }

  function renderBiannian(){
    const cats = ['全部','军事','政事','经济','外交','人事'];
    const rows = data.biannian.filter(recordMatch).filter(r=>state.biannianCat==='全部'||r.cat===state.biannianCat);
    const catBtns = cats.map(c=>`<button class="${state.biannianCat===c?'active':''}" onclick="tmSetRecordFilter('biannianCat','${c}')">${esc(c)}</button>`).join('');
    const activeHtml = data.longAffairs.map(a=>`<article class="bn-affair-v4"><b>${esc(a.type)} · ${esc(a.title)}</b><p>${esc(a.actor)} / ${esc(a.stage)} / 已历 ${esc(a.elapsed)} 日，余 ${esc(a.remaining)} 日</p><div class="bn-progress-v4"><i style="width:${Math.max(0,Math.min(100,Number(a.progress)||0))}%"></i></div><div class="tm-chip-row" style="margin-top:7px">${chip('优先 '+a.priority,a.priority==='高'?'hot':'')}${(a.stakeholders||[]).map(t=>chip(t)).join('')}</div></article>`).join('');
    const groups = groupBy(rows,r=>`${r.year} · ${r.season}`);
    const chronicle = Object.keys(groups).map(group=>`<section class="records-section-v4"><h3 class="records-section-title-v4"><span>${esc(group)}</span><small>${groups[group].length} 条</small></h3><div class="records-grid-v4">${groups[group].map(r=>`<article class="records-card-v4"><b>${esc(r.date)} · ${esc(r.cat)} · ${esc(r.title)}</b><p>${esc(r.body)}</p><div class="tm-chip-row">${(r.tags||[]).map(t=>chip(t)).join('')}</div></article>`).join('')}</div></section>`).join('');
    return `<div class="tm-stat-strip v4"><div class="tm-stat"><span>长期事势</span><b>${data.longAffairs.length}</b></div><div class="tm-stat"><span>编年条目</span><b>${data.biannian.length}</b></div><div class="tm-stat"><span>高优先</span><b>${data.longAffairs.filter(x=>x.priority==='高').length}</b></div><div class="tm-stat"><span>当前显示</span><b>${rows.length}</b></div><div class="tm-stat"><span>筛选</span><b>${esc(state.biannianCat)}</b></div></div><div class="records-toolbar-v4">${catBtns}</div><section class="records-section-v4"><h3 class="records-section-title-v4"><span>长期事务</span><small>active tracker</small></h3><div class="bn-active-grid-v4">${activeHtml}</div></section>${chronicle||'<div class="records-card-v4"><b>无匹配编年</b><p>调整搜索或类别筛选后再试。</p></div>'}`;
  }

  function tmSetRecordTab(tab){ state.recordTab = tab; openShilu(); }
  function tmRememberRecordQuery(value){ state.recordQuery = value; clearTimeout(state._recordSearchTimer); state._recordSearchTimer = setTimeout(openShilu, 160); }
  function tmSetRecordFilter(key, value){ state[key] = value; openShilu(); }
  function tmSetJishiView(view){ state.jishiView = view; openShilu(); }
  function tmRecordExportToast(){ toast('预览：导出会调用旧史记、实录、纪事、编年的导出逻辑。'); }

  const personState = window.TM_PERSON_STATE = window.TM_PERSON_STATE || {selected:'player', query:'', tab:'overview'};
  const persons = [
    {id:'player', name:'朱由校', courtesy:'天启', portrait:'img/portraits/ming-emperor-ai.png', role:'皇帝', office:'大明皇帝', faction:'皇室', location:'京师', status:'在朝', loyalty:100, ambition:62, stress:54, health:78, stats:{智:35,政:48,武:30,交:42,工:88,仁:55}, traits:['工巧','疑心','倚内廷'], goal:'中兴帝业，整饬辽事，在党争与内廷之间保住皇权。', bio:'天启帝在位已久，朝局为内廷与外朝所牵。其性好营造器作，但朝局压力正在迫使他转向更直接的裁断。'},
    {id:'zhangyan', name:'张嫣', courtesy:'祖娥', portrait:'img/portraits/ming-empress-ai.png', role:'皇后', office:'中宫皇后', faction:'后宫', location:'中宫', status:'在宫', loyalty:86, ambition:42, stress:38, health:82, stats:{智:70,政:58,武:12,交:76,工:45,仁:82}, traits:['谨慎','端肃','宫中耳目'], goal:'稳住中宫，避免内廷风闻牵动圣意。', bio:'张嫣处中宫，虽少直接干政，却能感知宫中风向。她适合作为私下问对与内廷记忆的入口。'},
    {id:'weizhongxian', name:'魏忠贤', courtesy:'完吾', portrait:'img/portraits/ming-eunuch-ai.png', role:'权宦', office:'司礼监掌印', faction:'阉党', location:'内廷', status:'掌权', loyalty:58, ambition:92, stress:46, health:70, stats:{智:75,政:80,武:42,交:84,工:55,仁:20}, traits:['权谋','厂卫','结党'], goal:'排除异己，巩固司礼监与厂卫对朝局的控制。', bio:'魏忠贤是内廷权力的枢纽。其资源强，但外廷疑惧也高，任何行动都可能触发党争。'},
    {id:'sunchengzong', name:'孙承宗', courtesy:'稚绳', portrait:'img/portraits/ming-scholar-ai.png', role:'重臣', office:'兵部尚书', faction:'清流', location:'京师', status:'在朝', loyalty:82, ambition:44, stress:51, health:67, stats:{智:85,政:76,武:78,交:66,工:48,仁:80}, traits:['持重','边务','经世'], goal:'整顿辽东军务，先稳军饷，再议练兵。', bio:'孙承宗兼具军政经验，是辽东问题中最稳妥的朝臣节点。'},
    {id:'yuanchonghuan', name:'袁崇焕', courtesy:'元素', portrait:'img/portraits/ming-general-ai.png', role:'边臣', office:'辽东巡抚', faction:'边镇', location:'宁远', status:'边任', loyalty:74, ambition:68, stress:73, health:75, stats:{智:78,政:63,武:86,交:55,工:42,仁:58}, traits:['敢任','火器','急切'], goal:'守宁远，补军饷，维持边镇士气。', bio:'袁崇焕身处辽东一线，传书、军饷、火器与朝廷信任都会影响他的后续行动。'},
    {id:'maoyilu', name:'毛一鹭', courtesy:'序臣', portrait:'img/portraits/ming-civil-ai.png', role:'地方官', office:'苏州知府', faction:'浙党', location:'苏州', status:'地方任', loyalty:60, ambition:56, stress:64, health:76, stats:{智:60,政:66,武:25,交:61,工:54,仁:48}, traits:['地方财赋','织造','漕运'], goal:'在织造、漕运与民力之间求平衡。', bio:'毛一鹭代表江南地方压力。其奏疏常牵动财赋、民心与漕运。'}
  ];

  function personCurrent(){
    return persons.find(p=>p.id===personState.selected) || persons[0];
  }

  function personBar(k,v){
    const n = Math.max(0,Math.min(100,Number(v)||0));
    return `<div class="tm-person-bar"><span>${esc(k)}</span><i style="--v:${n}%"></i><b>${n}</b></div>`;
  }

  function personLine(k,v){
    return `<div class="tm-person-line"><span>${esc(k)}</span><b>${esc(v ?? '未录')}</b></div>`;
  }

  function renderPersonAtlas(){
    const cur = personCurrent();
    const q = (personState.query||'').trim().toLowerCase();
    const list = persons.filter(p => !q || [p.name,p.courtesy,p.role,p.office,p.faction,p.location].join(' ').toLowerCase().includes(q));
    const tabs = [['overview','总览'],['identity','身份'],['career','履历'],['mind','心志'],['relations','关系'],['ceming','策名']].map(([id,label])=>`<button class="${personState.tab===id?'active':''}" onclick="tmSetPersonTab('${id}')">${esc(label)}</button>`).join('');
    return `<section class="tm-bridge-panel tm-person-rich-panel" role="dialog" aria-modal="true">
      <button class="tm-action-close tm-floating-close" data-close-bridge title="关闭">×</button>
      <div class="tm-person-rich">
        <aside class="tm-person-pane tm-person-left"><div class="tm-panel-v4-title"><span class="seal">人</span><span><b>人物图志</b><span>索引 / 筛选 / 策名</span></span></div><div class="tm-person-search"><input class="tm-input" placeholder="检索姓名、官职、党派、地点" value="${esc(personState.query)}" oninput="tmSetPersonSearch(this.value)"></div><div class="tm-person-list">${list.map(p=>`<button class="tm-person-row ${p.id===cur.id?'active':''}" onclick="tmSelectPerson('${p.id}')"><img src="${esc(p.portrait)}" alt=""><span><b>${esc(p.name)}${p.courtesy?' · '+esc(p.courtesy):''}</b><span>${esc(p.office)} · ${esc(p.faction)} · ${esc(p.location)}</span></span><small>${esc(p.status)}</small></button>`).join('')}</div></aside>
        <main class="tm-person-pane tm-person-main"><header class="tm-person-head"><img class="tm-person-portrait" src="${esc(cur.portrait)}" alt=""><div class="tm-person-title"><h2>${esc(cur.name)}</h2><p>${esc(cur.courtesy)} · ${esc(cur.role)} · ${esc(cur.office)}</p><div class="tm-chip-row">${(cur.traits||[]).map(t=>chip(t)).join('')}${chip(cur.faction,'green')}${chip(cur.status)}</div><p>${esc(cur.goal)}</p></div></header><div class="tm-person-tabs">${tabs}</div><div class="tm-person-scroll">${renderPersonTab(cur)}</div></main>
        <aside class="tm-person-pane tm-person-right"><div class="tm-person-card"><b>状态</b><div class="tm-person-grid">${personLine('忠诚',cur.loyalty)}${personLine('野心',cur.ambition)}${personLine('压力',cur.stress)}${personLine('健康',cur.health)}</div></div><div class="tm-person-card"><b>资源</b><p>公库关联：${cur.role==='皇帝'?'内帑与国帑皆可调度':'随官职调用'}。私产：田产、门生、家族声望与党派关系。</p></div><div class="tm-person-card"><b>可用行动</b><div class="tm-person-actions"><button class="primary" onclick="window.tmPreviewOpenRightPanel&&tmPreviewOpenRightPanel('issue')">转问对/朝议</button><button onclick="openHongyan()">鸿雁传书</button><button onclick="openYueZou()">关联奏疏</button><button onclick="openShilu()">摘入档案</button><button onclick="tmSetPersonTab('ceming')">策名入志</button></div></div><div class="tm-person-card"><b>关系摘要</b><p>${esc(cur.name)}当前与 ${cur.faction} 绑定较深。正式接入时读取人物志关系网、亲族、党派、恩怨与记忆。</p></div></aside>
      </div>
    </section>`;
  }

  function renderPersonTab(cur){
    if(personState.tab === 'identity'){
      return `<section class="tm-person-section"><h3>身份档案</h3><div class="tm-person-grid">${personLine('姓名',cur.name)}${personLine('字/号',cur.courtesy)}${personLine('身份',cur.role)}${personLine('官职',cur.office)}${personLine('党派',cur.faction)}${personLine('所在地',cur.location)}${personLine('状态',cur.status)}${personLine('文化', '华夏')}${personLine('信仰','儒 / 释 / 道')}</div></section><section class="tm-person-section"><h3>家族与资源</h3><p class="tm-muted">这里恢复旧人物志中身份、亲族、家产、公私资源的承载位置。正式游戏接入时不再用预览数据，而读取人物志字段。</p></section>`;
    }
    if(personState.tab === 'career'){
      return `<section class="tm-person-section"><h3>履历事件</h3>${['入仕任官','朝局牵连','当前目标'].map((x,i)=>`<div class="tm-person-card"><b>${esc(x)}</b><p>${esc(i===0?cur.office:i===1?cur.faction+' 相关事件会写入纪事与实录。':cur.goal)}</p></div>`).join('')}</section><section class="tm-person-section"><h3>可用字段</h3><div class="tm-person-grid">${personLine('履历','careerEvents')}${personLine('记忆','memories')}${personLine('作品','works')}${personLine('伤痕','scars')}</div></section>`;
    }
    if(personState.tab === 'mind'){
      return `<section class="tm-person-section"><h3>能力评量</h3>${Object.entries(cur.stats||{}).map(([k,v])=>personBar(k,v)).join('')}</section><section class="tm-person-section"><h3>心志</h3><div class="tm-person-card"><b>性情</b><p>${esc((cur.traits||[]).join('、') || '未录')}</p></div><div class="tm-person-card"><b>内心判断</b><p>压力、野心、忠诚与党派关系会影响问对、传书、奏疏与朝议中的回应。</p></div></section>`;
    }
    if(personState.tab === 'relations'){
      return `<section class="tm-person-section"><h3>关系网络</h3>${persons.filter(p=>p.id!==cur.id).map(p=>`<div class="tm-person-card"><b>${esc(p.name)} · ${esc(p.faction)}</b><p>关系：${p.faction===cur.faction?'同党 / 可协作':'异派 / 需观察'}。正式接入后读取旧人物志关系值。</p></div>`).join('')}</section>`;
    }
    if(personState.tab === 'ceming'){
      return `<section class="tm-person-section"><h3>策名</h3><p class="tm-muted">策名不是给当前人物随便改名，而是把历史人物、候选名录或玩家自创人物纳入人物志候选库，并校验时代、身份、是否在世、是否重复。</p><div class="tm-person-grid">${personLine('当前候选','徐光启 / 戚继光 / 海瑞 / 沈括')}${personLine('校验项','年代、身份、是否重复、是否已故')}${personLine('接入目标','人物志候选库')}${personLine('后续动作','入志 / 入朝 / 入野 / 标为传闻')}</div><div class="tm-person-actions"><button class="primary" onclick="toastPreview('预览：已打开策名候选校验')">校验候选</button><button onclick="toastPreview('预览：写入人物志候选库')">策名入志</button></div></section>`;
    }
    return `<section class="tm-person-section"><h3>人物总览</h3><div class="tm-person-grid">${personLine('姓名',cur.name)}${personLine('官职',cur.office)}${personLine('党派',cur.faction)}${personLine('所在地',cur.location)}${personLine('状态',cur.status)}${personLine('当前目标',cur.goal)}</div></section><section class="tm-person-section"><h3>传记</h3><div class="tm-person-card"><b>${esc(cur.name)}</b><p>${esc(cur.bio)}</p></div></section><section class="tm-person-section"><h3>能力</h3>${Object.entries(cur.stats||{}).map(([k,v])=>personBar(k,v)).join('')}</section>`;
  }

  function openRenwuTuzhi(opts={}){
    if(opts.selected) personState.selected = opts.selected;
    showOverlay('renwu-atlas-overlay', renderPersonAtlas());
  }

  function closeRenwuAtlas(){
    document.getElementById('renwu-atlas-overlay')?.remove();
  }

  function tmSelectPerson(id){ personState.selected = id; openRenwuTuzhi(); }
  function tmSetPersonSearch(value){ personState.query = value; clearTimeout(personState._timer); personState._timer = setTimeout(openRenwuTuzhi,160); }
  function tmSetPersonTab(tab){ personState.tab = tab; openRenwuTuzhi(); }

  const topbarState = window.TM_TOPBAR_STATE = window.TM_TOPBAR_STATE || {varTab:'overview', tipPinned:false};

  const CORE_VAR_DATA = [
    {key:'guoku', name:'帑廪', glyph:'帑', value:'银 12,000 / 粮 850万 / 布 12.0万', state:'国库三账', meta:'公帑、粮仓、布匹与回合收支', kpis:[['现银','12,000'],['粮仓','850万石'],['布匹','12.0万匹']],
      tabs:[
        {id:'overview', label:'概览', title:'帑廪总览', lines:[['账本状态','银入增加，粮储略降，布匹持平'],['本回判断','辽饷压力已入御案，若拨银需同时查核耗费'],['关联子系统','货币、央地分账、借贷、粮价']], note:'对应正式游戏的帑廪主变量，旧 UI 中货币与央地分账内容并入此处。'},
        {id:'ledger', label:'账目', title:'三账本', lines:[['银','12,000，两入 +82'],['粮','850万石，支出 -12'],['布','12.0万匹，持平'],['月入月支','户部常赋、辽饷、赈济与临时军费共同影响']]},
        {id:'actions', label:'处置', title:'可联动处置', lines:[['撰写诏书','可把拨饷、查耗费、催漕等内容送入诏令'],['百官奏疏','查看户部、兵部、地方对财计的奏报'],['问天','询问拨款后的党争、军心、财政连锁后果']]}
      ]},
    {key:'neitang', name:'内帑', glyph:'内', value:'银 2,300 / 粮 120万 / 珍 3', state:'内库平稳', meta:'内廷财货、皇庄与赏赐压力', kpis:[['现银','2,300'],['内仓','120万石'],['珍玩','3']],
      tabs:[
        {id:'overview', label:'概览', title:'内帑总览', lines:[['账本状态','内库可支，短期无亏空'],['本回判断','可少量补贴辽饷，但会引起外朝质疑'],['关联子系统','宗室压力、内廷赏赐、皇庄收入']]},
        {id:'ledger', label:'账目', title:'内库账目', lines:[['银','2,300，两入 +18'],['粮','120万石，入 +3'],['珍玩','3 件，可转赏或变卖'],['隐性压力','宫中修造、宗室请给与内廷人事']]},
        {id:'actions', label:'处置', title:'可联动处置', lines:[['转拨','可转入帑廪，但影响皇权与内廷关系'],['赏赐','可提升个别人物忠诚或内廷稳定'],['问天','询问内帑动用后的政治代价']]}
      ]},
    {key:'hukou', name:'户口', glyph:'户', value:'5,800 万', state:'缓增', meta:'户、口、丁、役法、迁徙与阶层', kpis:[['在籍','5,800万'],['丁口','可役'],['趋势','缓增']],
      tabs:[
        {id:'overview', label:'概览', title:'户口总览', lines:[['在籍人口','5,800 万'],['本回判断','江南漕运与水患会牵动逃户、役银和地方承载'],['关联子系统','徭役、兵役、大徭役、迁徙、阶层']]},
        {id:'ledger', label:'结构', title:'人口结构', lines:[['户','按剧本户籍折算'],['口','人口总量与增长趋势'],['丁','军役、徭役与调兵潜力'],['阶层','士绅、豪强、商贾、自耕、佃户等']]},
        {id:'actions', label:'处置', title:'可联动处置', lines:[['户政','清丈、编审、蠲免、迁徙'],['军政','募兵、征调、卫所整顿'],['问天','询问征发或蠲免对民心和财政的后果']]}
      ]},
    {key:'lizhi', name:'吏治', glyph:'吏', value:'65 · 渐弊', state:'渐弊', meta:'真实腐败、朝廷视野与监察', kpis:[['指数','65'],['视野','偏低'],['风险','党争牵连']],
      tabs:[
        {id:'overview', label:'概览', title:'吏治总览', lines:[['朝廷视野','表面可控，地方虚耗正在上升'],['本回判断','辽饷沿途耗费可触发都察院与厂卫争权'],['关联子系统','腐败明细、监察、厂卫、地方执行率']]},
        {id:'ledger', label:'明细', title:'腐败与监察', lines:[['户部','辽饷核销有疑点'],['地方','江南漕运耗损偏高'],['厂卫','可查得快，但政治副作用大'],['都察院','程序稳，时间较慢']]},
        {id:'actions', label:'处置', title:'可联动处置', lines:[['查办','交都察院、厂卫或二者会同'],['整饬','裁冗、核账、换员'],['问天','询问查办路径对党争和执行率的影响']]}
      ]},
    {key:'minxin', name:'民心', glyph:'民', value:'65', state:'尚稳', meta:'民心真伪、灾异、民变与谶纬', kpis:[['指数','65'],['灾情','可控'],['舆情','渐紧']],
      tabs:[
        {id:'overview', label:'概览', title:'民心总览', lines:[['真实民心','尚稳但对征发敏感'],['本回判断','若催漕过急，江南民情可能转差'],['关联子系统','民变、天象、谶纬、灾异']]},
        {id:'ledger', label:'地区', title:'地区与舆情', lines:[['江南','漕运迟滞，民力吃紧'],['辽东','军心与民心受粮饷影响'],['京师','党争风闻影响朝野观感']]},
        {id:'actions', label:'处置', title:'可联动处置', lines:[['赈济','缓解灾情与逃户'],['宽役','改善短期民心但减财政'],['问天','询问赈济、催征、镇压的长期后果']]}
      ]},
    {key:'huangquan', name:'皇权', glyph:'权', value:'70', state:'上升', meta:'诏令执行、奏疏、权臣与中央控制', kpis:[['指数','70'],['执行','偏强'],['阻力','中等']],
      tabs:[
        {id:'overview', label:'概览', title:'皇权总览', lines:[['权柄状态','诏令可行，但内阁与司礼监互相掣肘'],['本回判断','把辽饷与查账合为一道诏令，可强化裁断感'],['关联子系统','奏疏待批、抗疏、权臣、执行率']]},
        {id:'ledger', label:'结构', title:'权柄结构', lines:[['中央','内阁票拟与司礼监批红'],['地方','执行受财计和地方派系影响'],['军队','辽东军心对皇权感知敏感'],['内廷','内帑与厂卫改变皇权路径']]},
        {id:'actions', label:'处置', title:'可联动处置', lines:[['御案时政','推进当前朝政事项'],['撰写诏书','形成明确诏令'],['问天','询问不同裁断方式的政治后果']]}
      ]},
    {key:'huangwei', name:'皇威', glyph:'威', value:'80', state:'威望较高', meta:'朝廷威望、地方畏服、外邦观感', kpis:[['指数','80'],['朝廷','稳'],['边镇','待饷']],
      tabs:[
        {id:'overview', label:'概览', title:'皇威总览', lines:[['威望状态','朝廷尚能压住局势'],['本回判断','辽饷久拖会损边镇对朝廷威信的判断'],['关联子系统','失威危机、暴君综合症、感知扭曲']]},
        {id:'ledger', label:'维度', title:'威望维度', lines:[['朝廷','廷臣仍承认皇命有效'],['地方','受催征与灾异影响'],['军中','粮饷兑现决定边镇观感'],['外邦','辽东局势牵动外部试探']]},
        {id:'actions', label:'处置', title:'可联动处置', lines:[['宣示','公开裁断与赏罚'],['怀柔','赈济、赏军、减役'],['问天','询问威望变化对军心和外交的连锁影响']]}
      ]}
  ];

  const richVarTab = (id, label, title, sections, note, actions) => ({
    id,
    label,
    title,
    sections: Array.isArray(sections && sections[0] && sections[0].lines) ? sections : [{title, lines:sections || []}],
    note: note || '',
    actions: actions || []
  });

  CORE_VAR_DATA.splice(0, CORE_VAR_DATA.length,
    {
      key:'guoku',
      name:'帑廪',
      glyph:'帑',
      value:'银 12,000 / 粮 850万 / 布 12.0万',
      state:'国库三账 · 财政可支',
      meta:'承接旧 UI 帑廪抽屉：三仓、月入月支、货币、央地分账、借贷、破产、漏损与税种',
      kpis:[['现银','12,000'],['粮仓','850万石'],['布匹','12.0万匹']],
      tabs:[
        richVarTab('overview','总览','帑廪总览',[
          {title:'账本状态',lines:[['现银','12,000 两，回合入 +82'],['粮仓','850 万石，回合支 -12'],['布匹','12.0 万匹，持平'],['本回判断','辽饷压力已入御案，拨银前需同步查核沿途耗费']]},
          {title:'旧 UI 字段承接',lines:[['正式字段','GM.guoku.money / grain / cloth / monthlyIncome / monthlyExpense'],['关联子系统','货币市场、央地分账、借贷、监察预算、税种配置'],['事件钩子','帑廪告罄、破产触发、通胀猛涨、藩镇抗命、兼并危机']]}
        ],'旧 UI 中帑廪抽屉除银粮布外，还追加纸币、海外银流、央地分账、五类封建、破产七步、漏损三角、监察预算与十九原子税种。', ['转入撰写诏书','查看御案时政','询问问天']),
        richVarTab('ledger','三仓收支','帑廪账本',[
          {title:'三仓',lines:[['银','现余 12,000 · 月入 +180 · 月支 -98'],['粮','850 万石 · 粮价与赈济、军粮、漕运相连'],['布','12.0 万匹 · 军需、赏赐与交易可用'],['年估','年入约 +1,200 万两，受税种和央地合规影响']]},
          {title:'借贷与风险',lines:[['借贷在册','展示未偿笔数、本金、到期压力'],['破产七步','告罄后按七阶段触发信誉、军心、民心连锁'],['通胀','读取 GM.currency.market.inflation 与粮价'],['纸币','显示六态生命周期、信用、发行量、储备率与 25 条历代预设']]}
        ]),
        richVarTab('fiscal','税制与央地','税制 / 分账 / 漏损',[
          {title:'十九原子税种',lines:[['常赋','田赋、丁银、盐课、商税等基础收入'],['补启税种','商税、茶税、酒税、铁税、铜税、佣收、调收、算缗、皇庄、水磨税、杂捐'],['展示方式','启用税种显示税基、税率、名义收入与实征差额']]},
          {title:'央地分账',lines:[['分账模式','唐三分、明清起运存留、宋钱入中央、自定'],['区域表','名义收入、实征、留存、起运、合规率'],['海外银流','年度流入、流出、来源、汇出方向'],['漏损三角','腐败 × 皇威 × 帑廪，显示漏损率与本月漏损']]}
        ]),
        richVarTab('audit','监察与处置','财政处置',[
          {title:'监察预算',lines:[['御史可用','inspectorsAvailable / totalAuditsCompleted'],['强度与覆盖','strength、annualBudget、consumed、coverage'],['巨额支出劝谏','户部对临时大额支出的 pending 警告']]},
          {title:'可用处置',lines:[['撰写诏书','拨饷、催漕、查账、停役、增税或裁撤开支'],['百官奏疏','查看户部、兵部、地方财计奏报'],['问天','推演拨款后的财政、党争、军心和民心连锁']]}
        ],'', ['拨辽饷入诏','查耗费','打开全部变量'])
      ]
    },
    {
      key:'neitang',
      name:'内帑',
      glyph:'内',
      value:'银 2,300 / 粮 120万 / 珍 3',
      state:'内库平稳 · 可小额转拨',
      meta:'承接旧 UI 内帑抽屉：内库账本、皇庄、珍玩、宗室压力、近岁大典、皇威与皇权联动',
      kpis:[['现银','2,300'],['内仓','120万石'],['珍玩','3']],
      tabs:[
        richVarTab('overview','总览','内帑总览',[
          {title:'内库状态',lines:[['现银','2,300，两入 +18'],['内仓','120 万石，入 +3'],['珍玩','3 件，可赏赐、转卖或入礼仪'],['本回判断','可少量补贴辽饷，但外朝会质疑内廷干预国计']]},
          {title:'旧 UI 字段承接',lines:[['正式字段','GM.neitang.money / grain / treasure / monthlyIncome / monthlyExpense'],['关联子系统','皇庄、宗室禄米、宫中修造、内廷赏赐、内帑转国帑'],['风险','奢侈消费过度会降民心，并加快皇威消耗']]}
        ]),
        richVarTab('ledger','内库账','内帑账本',[
          {title:'收支结构',lines:[['银入','皇庄、内廷经营、特别税、赏赐回流'],['银出','修造、赏赐、内廷人事、宗藩请给'],['皇庄','旧 UI 显示 huangzhuangAcres 与相关收益'],['珍玩','可作为赏赐、外交礼物或临时变价资源']]},
          {title:'宗室压力',lines:[['宗室人数','读取 royalClanPressure.clanSize'],['月供','读取 clanMonthlyCost'],['请给压力','宗藩禄米会持续压内库与国库边界']]}
        ]),
        richVarTab('linkage','联动','内廷联动',[
          {title:'内帑 × 皇威',lines:[['大典','礼 / 祭 / 宴按旧逻辑提供皇威加成'],['代价','铺张过度降低民心，且可能制造外朝攻讦'],['近岁大典','显示 recentCeremonies 最近五条、费用与发生回合']]},
          {title:'内帑 × 皇权',lines:[['权臣段','皇权低时外戚 / 宦官侵占加重'],['专制段','皇权高时内帑独立性强，可直接服务皇帝意志'],['制衡段','内廷与外朝需要通过诏令或朝议协调']]}
        ],'', ['内帑转拨','赏赐人物','询问问天'])
      ]
    },
    {
      key:'hukou',
      name:'户口',
      glyph:'户',
      value:'5,800 万',
      state:'版籍缓增 · 隐户需查',
      meta:'承接旧 UI 户口抽屉：户、口、丁、逃户、黄册、承载力、徭役、兵制、阶层、迁徙与职业户籍',
      kpis:[['总口','5,800万'],['总户','1,116万'],['户均','5.2']],
      tabs:[
        richVarTab('overview','总览','户口总览',[
          {title:'基本盘',lines:[['户','约 1,116 万户'],['口','约 5,800 万口'],['丁','军役、徭役与调兵潜力的核心字段'],['逃户 / 隐户','逃户约 80 万，隐户约 600 万，影响税粮与役法']]},
          {title:'黄册与朝廷视野',lines:[['黄册准确度','旧 UI 显示户籍可信度，低则朝廷误判财政与兵源'],['本回判断','江南漕运与水患会牵动逃户、役银和地方承载'],['正式字段','GM.population.national / byRegion / byClass / corvee / military']]}
        ]),
        richVarTab('region','地区结构','地区五字段',[
          {title:'地区五字段',lines:[['聚落','坊、市、镇、村分布'],['性别','男、女与男女比'],['年龄','0-9 至 80+ 年龄金字塔'],['族群','byEthnicity，支持多族群比例'],['信仰','byFaith，支持儒释道及地方信仰']]},
          {title:'迁徙与承载',lines:[['环境承载力','nationalLoad、climatePhase、疤痕区域'],['京畿虹吸','科举、贵族消费、商业、官员员额四因子'],['阶层流动','七路阶层流动路径，影响长期户口结构']]}
        ]),
        richVarTab('service','役法兵制','徭役 / 兵役 / 军调',[
          {title:'十徭役分类',lines:[['役法','丁年日数或役银合一'],['分类','旧 UI 可列 10 类徭役，展示丁年、殁率与项目说明'],['大徭役','25 条历代预设，显示年、征丁、殁率与进度']]},
          {title:'兵制与军粮',lines:[['军种','六军种，基费、粮耗、战力系数、是否需马'],['军粮','三供给模式：自给、国家负担、混合'],['将领出身','四出身影响统兵、忠诚与野心'],['边防区','北疆、东北、西北、西南、东南五大区']]}
        ]),
        richVarTab('class','阶层户籍','阶层 / 色目 / 职业户籍',[
          {title:'阶层',lines:[['士绅 / 豪强','影响税粮漏损、地方执行和民心视野'],['商贾 / 工匠','影响商税、工役和城市财政'],['自耕 / 佃户','影响田赋、地权与民变风险'],['军户','影响兵源、军粮和卫所效率']]},
          {title:'扩展户籍',lines:[['色目职业','旧 UI 支持扩展到灶户、驿户、匠户、乐户等 120 色'],['用途','剧本和地图编辑器可用这些字段形成更细行政人口结构']]}
        ],'', ['清丈入诏','宽役','打开人物/地区'])
      ]
    },
    {
      key:'lizhi',
      name:'吏治',
      glyph:'吏',
      value:'65 · 渐弊',
      state:'真实浊度高于朝廷视野',
      meta:'承接旧 UI 吏治抽屉：真实浊度、朝廷视野、部门细分、九源、监察、腐败集团与巨额支出劝谏',
      kpis:[['朝廷视野','65'],['真实浊度','78'],['差额','+13']],
      tabs:[
        richVarTab('overview','总览','吏治总览',[
          {title:'真伪对比',lines:[['朝廷视野','65，御前看到的吏治'],['真实浊度','78，地方实际腐败更深'],['差额','+13，说明奏报粉饰或监察不足'],['本回判断','辽饷沿途耗费可能触发都察院与厂卫争权']]},
          {title:'正式字段',lines:[['主对象','GM.corruption'],['关键字段','trueIndex / perceivedIndex / overall / subDepts / sources'],['联动','影响帑廪漏损、皇威粉饰、奏疏可信度和执行率']]}
        ]),
        richVarTab('dept','部门细分','部门浊度',[
          {title:'部门',lines:[['中央','内阁、六部、都察院等中枢部门浊度'],['地方','省府州县实际执行与侵渔'],['军队','军饷、军粮、军籍与将领系统腐败'],['税司','税粮、漕运、商税和关津'],['内廷','司礼监、厂卫、内库与赏赐链条']]},
          {title:'显示方式',lines:[['旧 UI','逐部门显示真值，必要时与朝廷视野分离'],['新 UI','右键档案先展示字段位，正式接入再绑定真实数值']]}
        ]),
        richVarTab('sources','九源','腐浊所由',[
          {title:'九源累积',lines:[['俸薄','低薪诱发寻租'],['监弛','监察覆盖不足'],['急征','临时征派导致层层加码'],['鬻官','卖官鬻爵破坏任用'],['荐幸','门生故吏和私人荐举'],['宠信','近臣、内廷或权贵庇护'],['冗员','官僚膨胀造成支出与责任漂移'],['制弊','制度设计本身留下套利空间'],['巨支','大额临时项目诱发截留']]},
          {title:'模式与集团',lines:[['腐败集团','腐败 > 70 后可形成集团，显示凝聚、成员、抗性'],['游戏模式','演义 / 史实 / 严格影响腐败可见度和标注'],['巨额预警','户部劝谏 pending 列表显示 drafter、turn、content']]}
        ]),
        richVarTab('audit','监察案卷','监察中 / 已曝',[
          {title:'监察活动',lines:[['进行中','region、intensity、expectedReturnTurn'],['已查实','completed 且 found 的审计记录'],['预算覆盖','与帑廪的监察预算字段联动']]},
          {title:'可用处置',lines:[['都察院','程序稳，速度慢，政治副作用较低'],['厂卫','见效快，副作用大，会牵动皇权与民心'],['会同查办','适合高风险财计与军政案件']]}
        ],'', ['交都察院','命厂卫查','写入御案'])
      ]
    },
    {
      key:'minxin',
      name:'民心',
      glyph:'民',
      value:'65',
      state:'朝廷视野偏乐观',
      meta:'承接旧 UI 民心抽屉：真实民心、朝廷视野、阶层映射、民变、天象、祥瑞、谶纬与天人感应',
      kpis:[['朝廷视野','65'],['真实民心','52'],['差额','-13']],
      tabs:[
        richVarTab('overview','总览','民心真伪',[
          {title:'真伪对比',lines:[['真实民心','52，基层压力较高'],['朝廷视野','65，奏报偏乐观'],['段位','不稳但未崩'],['本回判断','若催漕过急，江南民情可能转差']]},
          {title:'正式字段',lines:[['主对象','GM.minxin'],['关键字段','trueIndex / perceivedIndex / byClass / revolts / prophecy'],['联动','灾异、征发、赈济、镇压、皇威与帑廪支出']]}
        ]),
        richVarTab('class','阶层民心','九旧分类映射',[
          {title:'旧分类',lines:[['士','清议、科举、党争与礼法'],['农','田赋、灾荒、徭役、逃户'],['工','工役、大徭役、城市营造'],['商','商税、关津、银流与市场'],['兵','军饷、军粮、边防与战事'],['僧','寺观、赈济、地方信仰'],['胥','衙役、里甲、基层执行'],['役','差役负担、征派与逃亡'],['豪强 / 流民','地方兼并与民变风险']]},
          {title:'显示逻辑',lines:[['旧 UI','可通过 PhaseF4.getMinxinByOldClass 读取旧分类口径'],['新 UI','以标签页集中展示，后续绑定旧字段即可']] }
        ]),
        richVarTab('revolt','民变灾异','民变 / 天象 / 谶纬',[
          {title:'民变',lines:[['等级','旧 UI 支持 5 级民变'],['地区','region'],['规模','scale'],['原因','cause'],['领袖','leader'],['镇压','可记录调兵命令与官军强度']]},
          {title:'异象三库',lines:[['天象库','彗星、日食、地震等灾异'],['祥瑞库','嘉禾、甘露、瑞兽等祥瑞'],['谶纬库','流言、谣谶、民间预言'],['天人感应','近期是否有天示，影响民心解释与朝议口径']]}
        ]),
        richVarTab('actions','应对','民情处置',[
          {title:'可用处置',lines:[['赈济','消耗帑廪，缓解灾情与逃户'],['宽役','短期改善民心，但影响财政和工程'],['镇压','压低民变，伤皇威和长期民心'],['问对 / 朝议','读取不同人物对民情的解释']]},
          {title:'旧 UI 跳转',lines:[['朱批奏疏','地方灾情、民变、谣言奏报'],['撰写诏书','赈济、免役、安抚、缉捕'],['鸿雁传书','私下询问地方官或边臣']]}
        ],'', ['赈济入诏','查看民变','询问问天'])
      ]
    },
    {
      key:'huangquan',
      name:'皇权',
      glyph:'权',
      value:'70',
      state:'可用但受权臣牵制',
      meta:'承接旧 UI 皇权抽屉：指数、四维、诏令执行率、奏疏、抗疏、权臣、五要素与四象限原型',
      kpis:[['皇权','70'],['诏令通过','92%'],['执行力','78%']],
      tabs:[
        richVarTab('overview','总览','皇权指数',[
          {title:'权柄状态',lines:[['指数','70 / 100'],['段位','专制门槛附近，可强裁但副作用明显'],['诏令执行率','78%，受皇威、诏书完整度和地方吏治影响'],['本回判断','把辽饷与查账合为一道诏令，可强化裁断感']]},
          {title:'正式字段',lines:[['主对象','GM.huangquan'],['关键字段','index / phase / executionRate / subDims / powerMinister'],['待办来源','GM._pendingMemorials / GM._abductions / 侍臣问疑']]}
        ]),
        richVarTab('dims','四维','权柄结构',[
          {title:'四维',lines:[['中央','内阁票拟、六部执行与都察院监督'],['地方','省府州县执行受财计和地方派系影响'],['军队','边镇军心对皇命兑现极敏感'],['内廷','司礼监、厂卫与内帑改变皇权路径']]},
          {title:'奏疏与抗疏',lines:[['奏疏待朱批','status=drafted 的 memorial 数量'],['近年抗疏','objector、content、turn'],['侍臣问疑','专制段诏书缺要素时触发请圣裁']] }
        ]),
        richVarTab('minister','权臣','权臣坐大',[
          {title:'权臣字段',lines:[['姓名','powerMinister.name'],['控制度','controlLevel'],['党羽','faction.length'],['拦截','可能拦截奏疏、改写口径或拖慢执行'],['自拟','权臣可自拟政策或借诏令扩大权力']]},
          {title:'四象限原型',lines:[['暴君顶点','朱元璋末 / 隋炀帝式，令出必行但隐伤极大'],['事必躬亲无人听','崇祯末式，勤政但执行崩坏'],['受敬傀儡','高皇威低皇权，名义受尊实际难行'],['汉献帝式傀儡','低皇威低皇权'],['制衡威严','唐太宗 / 康熙中期式理想段']] }
        ]),
        richVarTab('edict','诏书校验','执行率与五要素',[
          {title:'执行率公式',lines:[['公式','皇权基 × 皇威乘数 × 诏书详略'],['皇权基','0.5 + 皇权指数 / 200'],['皇威乘数','暴君 1.3 / 威严 1.1 / 衰微 0.7 / 失威 0.35'],['诏书详略','完整度 0.5~1.0']]},
          {title:'专制段五要素',lines:[['时日','何时行事'],['地点','何地执行'],['执行人','谁负责'],['经费','钱粮从何处来'],['考核','如何验收与问责']]}
        ],'', ['转撰写诏书','查看奏疏','推进御案时政'])
      ]
    },
    {
      key:'huangwei',
      name:'皇威',
      glyph:'威',
      value:'80',
      state:'颂声略高于真实威望',
      meta:'承接旧 UI 皇威抽屉：真值、朝廷视野、四维、粉饰公式、执行乘数、朝代预设、暴君综合症与失威危机',
      kpis:[['真实皇威','75'],['朝廷视野','80'],['差额','+5']],
      tabs:[
        richVarTab('overview','总览','皇威指数',[
          {title:'真伪对比',lines:[['真实皇威','75'],['朝廷视野','80'],['段位','威严段'],['本回判断','辽饷久拖会损边镇对朝廷威信的判断']]},
          {title:'正式字段',lines:[['主对象','GM.huangwei'],['关键字段','index / perceivedIndex / phase / subDims / tyrantSyndrome / lostAuthorityCrisis'],['联动','影响诏令执行率、地方粉饰、奏疏口径、外邦试探']]}
        ]),
        richVarTab('dims','四维','威望维度',[
          {title:'四维',lines:[['朝廷','廷臣是否承认皇命有效'],['地方','地方畏服与官府执行观感'],['军中','粮饷兑现、赏罚与战事结果'],['外邦','边疆、朝贡、敌国对朝廷强弱的判断']]},
          {title:'朝代预设参考',lines:[['开国','高皇威、高皇权、低腐败'],['盛世','高威信与较好民心'],['衰世','腐败抬升、民心下滑'],['末世','失威危机、抗疏、军心与外邦风险齐升']] }
        ]),
        richVarTab('formula','粉饰公式','地方粉饰五段',[
          {title:'五段粉饰',lines:[['暴君（≥90）','奏疏 90% 颂圣，perceived 高估'],['威严（70-89）','基本真实，轻微粉饰'],['常望（50-69）','中等粉饰，低风险'],['衰微（30-49）','粉饰愈急，地方抬值'],['失威（<30）','抗疏公然，粉饰无力']]},
          {title:'执行度乘数',lines:[['暴君','×1.30，令出必行但过度执行'],['威严','×1.00，诏命畅达'],['常望','×0.85，略有阻'],['衰微','×0.65，诏行有阻'],['失威','×0.35，诏不出京']]}
        ]),
        richVarTab('crisis','危机','暴君综合症 / 失威危机',[
          {title:'暴君综合症',lines:[['激活条件','皇威过高且强压异议'],['颂圣比例','tyrantSyndrome.flatteryMemorialRatio'],['过度执行','overExecutionLog'],['隐伤','民心暗降、隐匿腐败、地方噤声']]},
          {title:'失威危机',lines:[['激活条件','皇威跌入失威段'],['抗疏频次','lostAuthorityCrisis.objectionFrequency'],['外邦蠢动','foreignEmboldened'],['后果','地方抗命、军心不稳、诏令失效']] }
        ],'', ['宣示威断','怀柔赏军','询问问天'])
      ]
    }
  );

  const FALLBACK_SCENARIO_VARS = [
    {key:'scenario:eraFocus', name:'朝局焦点', value:'阉党势盛', meta:'剧本变量 · 决定开局政治重心'},
    {key:'scenario:liaodongSupply', name:'辽东饷路', value:'待拨', meta:'剧本变量 · 影响军心与边镇态势'},
    {key:'scenario:jiangnanCanal', name:'江南漕运', value:'迟滞', meta:'剧本变量 · 影响粮仓、民心与财政'},
    {key:'scenario:courtMemory', name:'朝议记忆', value:'魏党把持', meta:'剧本变量 · 影响问对与朝议口径'}
  ];

  const FALLBACK_RUNTIME_VARS = [
    {key:'runtime:turnDays', name:'每回合流逝', value:'30 日', meta:'运行变量 · 由剧本设定驱动'},
    {key:'runtime:mapMode', name:'地图模式', value:'势力视图', meta:'运行变量 · 当前预览模式'},
    {key:'runtime:recentNewsScope', name:'近事范围', value:'最近三回合', meta:'运行变量 · 事件框读取范围'}
  ];

  function valueFromTopbar(key, fallback){
    const el = document.querySelector(`.tb-var[data-key="${key}"]`);
    if(!el) return fallback;
    const subs = el.querySelector('.tb-vsubs');
    const val = subs ? subs.textContent : (el.querySelector('.tb-vv')?.textContent || '');
    return (val || '').replace(/\s+/g,' ').trim() || fallback;
  }

  function coreVarByKey(key){
    const base = CORE_VAR_DATA.find(v => v.key === key) || CORE_VAR_DATA[0];
    return Object.assign({}, base, {value:valueFromTopbar(base.key, base.value), group:'七大核心变量', type:'core'});
  }

  function collectPreviewAllVars(){
    const core = CORE_VAR_DATA.map(v => coreVarByKey(v.key));
    const scenarioRaw = Array.isArray(window.P?.variables) ? window.P.variables : [];
    const runtimeVars = (window.GM && window.GM.vars && typeof window.GM.vars === 'object') ? window.GM.vars : {};
    const scenario = scenarioRaw.length ? scenarioRaw.map((v, idx) => {
      const name = v.displayName || v.name || `剧本变量 ${idx+1}`;
      const rawKey = v.name || `scenario_${idx}`;
      const value = runtimeVars[rawKey] ?? v.value ?? v.initial ?? '未赋值';
      return {key:`scenario:${rawKey}`, name, value:String(value), meta:v.description || '剧本编辑器变量', group:'剧本变量', type:'scenario'};
    }) : FALLBACK_SCENARIO_VARS.map(v => Object.assign({group:'剧本变量', type:'scenario'}, v));
    const scenarioKeys = new Set(scenarioRaw.map(v => v.name).filter(Boolean));
    const extraKeys = Object.keys(runtimeVars).filter(k => !scenarioKeys.has(k));
    const runtime = extraKeys.length ? extraKeys.map(k => {
      let value = runtimeVars[k];
      if(value && typeof value === 'object') value = JSON.stringify(value).slice(0, 80);
      return {key:`runtime:${k}`, name:k, value:String(value), meta:'运行时变量', group:'运行时变量', type:'runtime'};
    }) : FALLBACK_RUNTIME_VARS.map(v => Object.assign({group:'运行时变量', type:'runtime'}, v));
    return {core, scenario, runtime};
  }

  function previewVarByKey(key){
    const all = collectPreviewAllVars();
    const flat = [...all.core, ...all.scenario, ...all.runtime];
    const found = flat.find(v => v.key === key || v.key.replace(/^(scenario|runtime):/,'') === key);
    if(!found) return coreVarByKey('guoku');
    if(found.type === 'core') return coreVarByKey(found.key);
    return {
      key: found.key,
      name: found.name,
      glyph: found.type === 'scenario' ? '剧' : '变',
      value: found.value,
      state: found.type === 'scenario' ? '剧本变量' : '运行变量',
      meta: found.meta,
      kpis: [['当前值', found.value], ['来源', found.group], ['键名', found.key.replace(/^(scenario|runtime):/,'')]],
      tabs: [
        {id:'overview', label:'概览', title:found.name, lines:[['当前值', found.value], ['来源', found.group], ['说明', found.meta || '未记录说明']]},
        {id:'ledger', label:'字段', title:'字段信息', lines:[['变量键', found.key.replace(/^(scenario|runtime):/,'')], ['变量组', found.group], ['接入方式','正式接入时读取剧本编辑器变量与 GM.vars']]},
        {id:'actions', label:'联动', title:'可联动位置', lines:[['问天','可作为推演上下文'], ['诏令/奏疏','可作为条件或效果字段'], ['地图/人物','可用于筛选和结算判断']]}
      ]
    };
  }

  function varCardHtml(v){
    const search = `${v.name} ${v.value} ${v.meta||''} ${v.key}`.toLowerCase();
    return `<button class="tm-var-card ${esc(v.type||'')}" data-var-key="${esc(v.key)}" data-search="${esc(search)}">
      <div class="tm-var-card-head"><span class="tm-var-card-name">${esc(v.name)}</span><b class="tm-var-card-value">${esc(v.value)}</b></div>
      <div class="tm-var-card-meta">${esc(v.meta || v.group || '')}</div>
    </button>`;
  }

  function allVarGroupHtml(title, rows){
    return `<section class="tm-allvars-section"><h3 class="tm-allvars-group-title">${esc(title)} · ${rows.length}</h3><div class="tm-allvars-grid">${rows.map(varCardHtml).join('')}</div></section>`;
  }

  function openPreviewAllVars(){
    const vars = collectPreviewAllVars();
    const body = [
      allVarGroupHtml('七大核心变量', vars.core),
      allVarGroupHtml('剧本变量', vars.scenario),
      allVarGroupHtml('运行时变量', vars.runtime)
    ].join('');
    const ov = showOverlay('preview-allvars-overlay', `<section class="tm-bridge-panel tm-allvars-panel" role="dialog" aria-modal="true">
      <header class="tm-bridge-head"><div class="tm-bridge-title"><strong>全部变量</strong><span>七大核心变量、剧本编辑器变量与运行时变量总览</span></div><button class="tm-bridge-close" data-close-bridge>×</button></header>
      <div class="tm-allvars-toolbar"><input id="tm-allvars-search-rich" class="tm-allvars-search" placeholder="筛选变量名、键名或说明"></div>
      <div class="tm-allvars-body">${body}<div class="tm-allvars-hint"><span>左键打开变量详情；七大核心变量也可在顶部栏右键打开。</span><span>正式游戏接入时读取 P.variables 与 GM.vars。</span></div></div>
    </section>`);
    ov.querySelectorAll('[data-var-key]').forEach(btn => btn.addEventListener('click', () => openPreviewVarDossier(btn.dataset.varKey)));
    const input = ov.querySelector('#tm-allvars-search-rich');
    input?.addEventListener('input', () => {
      const q = input.value.trim().toLowerCase();
      ov.querySelectorAll('.tm-var-card').forEach(card => {
        card.hidden = q && !(card.dataset.search || '').includes(q);
      });
    });
    input?.focus();
  }

  function varKpisHtml(d){
    return (d.kpis || []).map(([k,v]) => `<div class="tm-var-kpi"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
  }

  function varPanelHtml(tab){
    const sections = tab.sections || [{title:tab.title || tab.label, lines:tab.lines || []}];
    const lines = sections.map(sec => {
      const rows = (sec.lines || []).map(([k,v]) => `<div class="tm-var-line"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join('');
      return `<div class="tm-var-subsection"><h4>${esc(sec.title || tab.title || tab.label)}</h4><div class="tm-var-lines">${rows}</div></div>`;
    }).join('');
    const note = tab.note ? `<p class="tm-var-note">${esc(tab.note)}</p>` : '';
    const actions = (tab.actions || []).length ? `<div class="tm-var-action-row">${tab.actions.map(a => `<button type="button" class="tm-var-action" data-var-action="${esc(a)}">${esc(a)}</button>`).join('')}</div>` : '';
    return `<section class="tm-var-section"><h3>${esc(tab.title || tab.label)}</h3>${lines}${note}${actions}</section>`;
  }

  function openPreviewVarDossier(key){
    const d = previewVarByKey(key);
    const tabs = d.tabs || [];
    const active = tabs.some(t => t.id === topbarState.varTab) ? topbarState.varTab : (tabs[0]?.id || 'overview');
    topbarState.varTab = active;
    const tabButtons = tabs.map(t => `<button class="tm-var-tab ${t.id===active?'active':''}" data-var-tab="${esc(t.id)}">${esc(t.label)}</button>`).join('');
    const tabPanels = tabs.map(t => `<div class="tm-var-panel ${t.id===active?'active':''}" data-var-panel="${esc(t.id)}">${varPanelHtml(t)}</div>`).join('');
    showOverlay('preview-var-dossier-overlay', `<section class="tm-bridge-panel tm-core-dossier" role="dialog" aria-modal="true">
      <header class="tm-bridge-head"><div class="tm-bridge-title"><strong>${esc(d.name)}</strong><span>${esc(d.meta || '变量详情')}</span></div><button class="tm-bridge-close" data-close-bridge>×</button></header>
      <div class="tm-var-hero"><div class="tm-var-seal">${esc(d.glyph || '变')}</div><div class="tm-var-summary"><div class="tm-var-card-head"><span class="tm-var-card-name">${esc(d.name)}</span><b class="tm-var-card-value">${esc(d.value)}</b></div><div class="tm-var-card-meta">${esc(d.state || '')}</div><div class="tm-var-kpis">${varKpisHtml(d)}</div></div></div>
      <div class="tm-var-tabs">${tabButtons}</div>
      <div class="tm-var-scroll">${tabPanels}</div>
    </section>`);
    const ov = document.getElementById('preview-var-dossier-overlay');
    ov?.querySelectorAll('.tm-var-tab').forEach(btn => btn.addEventListener('click', () => tmPreviewSwitchVarTab(btn.dataset.varTab)));
    ov?.querySelectorAll('[data-var-action]').forEach(btn => btn.addEventListener('click', () => toast(`预览：${btn.dataset.varAction}`)));
  }

  function tmPreviewSwitchVarTab(tab){
    topbarState.varTab = tab;
    const ov = document.getElementById('preview-var-dossier-overlay');
    if(!ov) return;
    ov.querySelectorAll('.tm-var-tab').forEach(btn => btn.classList.toggle('active', btn.dataset.varTab === tab));
    ov.querySelectorAll('.tm-var-panel').forEach(panel => panel.classList.toggle('active', panel.dataset.varPanel === tab));
  }

  const wentianState = window.TM_WENTIAN_STATE = window.TM_WENTIAN_STATE || {
    cat:'',
    directives:[
      {type:'规则', text:'玩家通过问天给出的持久规则会在下回合推演前进入上下文。'},
      {type:'纠正', text:'若玩家纠正 AI 对时代、人物、地理或制度的理解，先记录后确认。'}
    ],
    memories:[],
    history:[
      {role:'system', tag:'问天系统', text:'AI 会解读你的指令，确认后入库，并在每回合回报执行状况。'},
      {role:'user', tag:'御前样例', text:'若先拨十八万两辽饷，并令都察院查沿途耗费，会怎样？'},
      {role:'ai', tag:'推演概要', text:'短期可稳辽东军心，国帑承压。若同时查耗费，可减少清流攻讦，但会激化司礼监疑惧。'}
    ]
  };

  const WT_CATS = [
    ['', '自动'],
    ['narrative','叙事'],
    ['setting','设定'],
    ['hardChange','直改数值'],
    ['edictSubstitute','诏令替代'],
    ['absolute','天意']
  ];

  function wentianMessageHtml(m){
    const cls = m.role === 'user' ? 'user' : m.role === 'system' ? 'system' : m.role === 'directive' ? 'directive' : 'ai';
    return `<div class="tm-wentian-msg ${cls}"><div class="role">${esc(m.tag || '问天')}<em>${esc(m.role === 'user' ? '御前' : m.role === 'system' ? '系统' : '回响')}</em></div><div class="text">${esc(m.text)}</div></div>`;
  }

  function renderWentianDirectives(){
    const rows = wentianState.directives || [];
    if(!rows.length) return '<div class="tm-wt-empty">暂无活跃指令。</div>';
    return rows.map((d, idx) => `<div class="tm-directive-card"><b>${esc(d.type || '指令')} ${idx+1}</b><span>${esc(d.text)}</span></div>`).join('');
  }

  function openPreviewWentian(){
    const cats = WT_CATS.map(([id,label]) => `<button class="tm-wentian-cat ${wentianState.cat===id?'active':''}" onclick="tmPreviewWentianSetCategory('${esc(id)}')">${esc(label)}</button>`).join('');
    const tools = [
      ['doc','导入文档'],
      ['memory','注入记忆'],
      ['clear','清除指令']
    ].map(([id,label]) => `<button onclick="tmPreviewWentianTool('${id}')">${label}</button>`).join('');
    showOverlay('preview-wentian-overlay', `<section class="tm-bridge-panel tm-wentian-panel" role="dialog" aria-modal="true">
      <header class="tm-bridge-head"><div class="tm-bridge-title"><strong>问天</strong><span>与推演 AI 直接对话，下回合生效；可记录指令、纠正、设定与数值直改请求</span></div><button class="tm-bridge-close" data-close-bridge>×</button></header>
      <div class="tm-wentian-body">
        <main class="tm-wentian-main">
          <div class="tm-wt-toolbar"><span class="tm-wentian-side-title" style="margin:0;align-self:center">分类</span>${cats}<span class="tm-wt-counts">指令 ${wentianState.directives.length} · 记忆 ${wentianState.memories.length}</span></div>
          <div class="tm-wentian-log">${wentianState.history.map(wentianMessageHtml).join('')}</div>
          <div class="tm-wentian-input"><textarea id="tm-wt-input" placeholder="对推演 AI 说……例如：纠正推演、加入规则、加入背景或直改某个变量"></textarea><button class="tm-wentian-send" onclick="tmPreviewWentianSend()">问天</button></div>
        </main>
        <aside class="tm-wentian-side"><div class="tm-wentian-tools">${tools}</div><div class="tm-wentian-queue"><h3 class="tm-wentian-side-title">活跃指令</h3>${renderWentianDirectives()}<h3 class="tm-wentian-side-title" style="margin-top:12px">可读取线索</h3><div class="tm-directive-card"><b>七大核心变量</b><span>帑廪、内帑、户口、吏治、民心、皇权、皇威</span></div><div class="tm-directive-card"><b>近三回合事件</b><span>辽饷、党争、漕运、灾异与人物对话</span></div><div class="tm-directive-card"><b>当前舆图</b><span>势力归属、地区详情与地图模式</span></div></div><div class="tm-wentian-foot">预览页只恢复入口与交互形态；正式 AI 发送、确认入库和回合执行仍由正式游戏逻辑承接。</div></aside>
      </div>
    </section>`);
    document.getElementById('tm-wt-input')?.focus();
  }

  function tmPreviewWentianSetCategory(cat){
    wentianState.cat = cat || '';
    openPreviewWentian();
  }

  function tmPreviewWentianSend(){
    const input = document.getElementById('tm-wt-input');
    const text = (input?.value || '').trim();
    if(!text){ toast('先输入要问天的内容。'); return; }
    const cat = WT_CATS.find(([id]) => id === wentianState.cat)?.[1] || '自动';
    wentianState.history.push({role:'user', tag:`御前 · ${cat}`, text});
    if(wentianState.cat === 'hardChange'){
      wentianState.directives.push({type:'直改数值', text});
      wentianState.history.push({role:'ai', tag:'待确认', text:'已按“直改数值”记录。正式游戏中会要求确认具体 GM/P 字段路径后再生效。'});
    }else if(wentianState.cat === 'edictSubstitute'){
      wentianState.history.push({role:'ai', tag:'诏令替代', text:'这类内容更适合转入“撰写诏书”。预览页先记录，正式接入时会改写并填入诏令草稿。'});
    }else{
      wentianState.directives.push({type:cat === '自动' ? '指令' : cat, text});
      wentianState.history.push({role:'ai', tag:'已记录', text:'已作为问天指令写入预览队列。正式游戏中会在确认后入库，并于下回合推演前加入上下文。'});
    }
    openPreviewWentian();
  }

  function tmPreviewWentianTool(kind){
    if(kind === 'clear'){
      wentianState.directives = [];
      wentianState.history.push({role:'system', tag:'问天系统', text:'活跃指令已清空。'});
      openPreviewWentian();
      return;
    }
    if(kind === 'memory'){
      wentianState.memories.push({turn:'预览', text:'导入一段对话记忆'});
      wentianState.history.push({role:'system', tag:'注入记忆', text:'已加入一条预览记忆。正式游戏中此处承接旧问天的“注入记忆”。'});
      openPreviewWentian();
      return;
    }
    toast('预览：导入文档会调用正式问天的文档上下文入口。');
  }

  function buildTopbarTip(d){
    return `<div class="vp-title">${esc(d.name)} <em class="vp-pill note">${esc(d.state || '')}</em></div>
      <div class="vp-section">当前</div>
      <div class="vp-row"><span class="vp-k">数值</span><span class="vp-v">${esc(d.value)}</span></div>
      ${(d.kpis || []).slice(0,3).map(([k,v]) => `<div class="vp-row"><span class="vp-k">${esc(k)}</span><span class="vp-v">${esc(v)}</span></div>`).join('')}
      <div class="vp-divider"></div><div class="vp-hint">右键打开详情面板 · 左键固定/取消此浮窗</div>`;
  }

  function showTopbarTip(el, key, pinned){
    const pop = document.getElementById('varpop');
    if(!pop) return;
    const d = previewVarByKey(key);
    pop.innerHTML = buildTopbarTip(d);
    const rect = el.getBoundingClientRect();
    const width = 300;
    const x = Math.max(12, Math.min(window.innerWidth - width - 12, rect.left + rect.width / 2 - width / 2));
    const y = Math.min(window.innerHeight - 190, rect.bottom + 8);
    pop.style.left = `${x}px`;
    pop.style.top = `${Math.max(54, y)}px`;
    pop.classList.add('show');
    pop.classList.toggle('pinned', !!pinned);
  }

  function hideTopbarTip(){
    if(topbarState.tipPinned) return;
    const pop = document.getElementById('varpop');
    pop?.classList.remove('show','pinned');
  }

  function replaceForBinding(el){
    if(!el || !el.parentNode) return null;
    const clone = el.cloneNode(true);
    el.parentNode.replaceChild(clone, el);
    return clone;
  }

  function installTopbarBindings(){
    const wentian = replaceForBinding(document.querySelector('.tb-wentian'));
    if(wentian){
      wentian.title = '问天 · 与推演 AI 对话';
      wentian.addEventListener('click', openPreviewWentian);
    }
    const allVars = replaceForBinding(document.querySelector('.tb-chip'));
    if(allVars){
      allVars.title = '全部变量';
      allVars.addEventListener('click', openPreviewAllVars);
    }
    document.querySelectorAll('.tb-var').forEach(old => {
      const el = replaceForBinding(old);
      if(!el) return;
      const key = el.dataset.key || 'guoku';
      const d = previewVarByKey(key);
      el.title = `${d.name} · 右键打开详情`;
      el.addEventListener('mouseenter', () => { if(!topbarState.tipPinned) showTopbarTip(el, key, false); });
      el.addEventListener('mouseleave', hideTopbarTip);
      el.addEventListener('click', ev => {
        ev.preventDefault();
        topbarState.tipPinned = !topbarState.tipPinned;
        document.querySelectorAll('.tb-var.pinned').forEach(x => { if(x !== el) x.classList.remove('pinned'); });
        el.classList.toggle('pinned', topbarState.tipPinned);
        if(topbarState.tipPinned) showTopbarTip(el, key, true);
        else hideTopbarTip();
      });
      el.addEventListener('contextmenu', ev => {
        ev.preventDefault();
        topbarState.tipPinned = false;
        document.querySelectorAll('.tb-var.pinned').forEach(x => x.classList.remove('pinned'));
        document.getElementById('varpop')?.classList.remove('show','pinned');
        topbarState.varTab = 'overview';
        openPreviewVarDossier(key);
      });
    });
    if(!document.documentElement.dataset.tmTopbarRestoreDocBound){
      document.documentElement.dataset.tmTopbarRestoreDocBound = '1';
      document.addEventListener('click', ev => {
        if(ev.target.closest('.tb-var') || ev.target.closest('#varpop')) return;
        topbarState.tipPinned = false;
        document.querySelectorAll('.tb-var.pinned').forEach(x => x.classList.remove('pinned'));
        document.getElementById('varpop')?.classList.remove('show','pinned');
      });
    }
  }

  Object.assign(window, {
    openYueZou,
    openHongyan,
    openShilu,
    openPreviewWentian,
    openPreviewAllVars,
    openPreviewVarDossier,
    tmPreviewSwitchVarTab,
    tmPreviewWentianSetCategory,
    tmPreviewWentianSend,
    tmPreviewWentianTool,
    tmSetMemorialFilter,
    tmSetMemorialReply,
    tmMemorialAction,
    tmSelectLetterTarget,
    tmSetLetterFilter,
    tmSetLetterSearch,
    tmToggleLetterMulti,
    tmSendPreviewLetter,
    tmLetterAction,
    tmLetterExcerpt,
    tmSetRecordTab,
    tmRememberRecordQuery,
    tmSetRecordFilter,
    tmSetJishiView,
    tmRecordExportToast
  });

  function bootRichRestore(){
    restoreVisibleLabels();
    installTopbarBindings();
  }

  if(document.readyState === 'loading'){
    document.addEventListener('DOMContentLoaded', bootRichRestore, {once:true});
  }else{
    bootRichRestore();
  }
})();
