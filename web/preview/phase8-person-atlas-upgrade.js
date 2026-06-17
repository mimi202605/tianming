(function(){
  'use strict';

  const esc = value => String(value ?? '').replace(/[&<>"']/g, ch => ({
    '&':'&amp;',
    '<':'&lt;',
    '>':'&gt;',
    '"':'&quot;',
    "'":'&#39;'
  }[ch]));

  const toast = text => {
    if(typeof window.toastPreview === 'function') window.toastPreview(text);
    else console.log(text);
  };

  const personState = window.TM_PERSON_STATE = Object.assign({
    selected:'player',
    query:'',
    tab:'overview',
    group:'all',
    role:'all',
    sort:'importance',
    showDead:false
  }, window.TM_PERSON_STATE || {});
  if(personState.tab === 'identity') personState.tab = 'dossier';
  if(personState.tab === 'ceming') personState.tab = 'family';

  const persons = [
    {
      id:'player', name:'朱由校', courtesy:'天启', portrait:'img/portraits/ming-emperor-ai.png',
      role:'皇帝', roleType:'sovereign', office:'大明皇帝', rank:'九五至尊', age:18, gender:'男',
      faction:'皇室', location:'京师', status:'在朝', alive:true, importance:100,
      loyalty:100, ambition:62, stress:54, health:78,
      stats:{智:35,政:48,武:30,交:42,工:88,仁:55},
      traits:['工巧','疑心','倚内廷','亲裁'],
      flags:['可问对','可御批','策名基准'],
      goal:'中兴帝业，整饬辽事，在党争与内廷之间保住皇权。',
      bio:'天启帝在位已久，朝局为内廷与外朝所牵。其性好营造器作，但朝局压力正在迫使他转向更直接的裁断。',
      appearance:'面容清瘦，常带倦色，衣冠尚俭而袖口有工匠墨痕。',
      dualIdentity:'君主 / 工匠心性 / 朝局仲裁者',
      family:{origin:'明宗室', father:'朱常洛', mother:'王才人', spouse:'张嫣', children:'未录', heir:'信王朱由检', clan:'皇明朱氏'},
      resources:{public:'国帑、内帑、诏令权', private:'皇庄、内库珍玩', retainers:'司礼监、御前近侍', reputation:'皇威尚高，外廷观望'},
      works:['木作器具','宫中营造图样'],
      career:['即位改元，重整内廷奏报','辽东军饷入御案，命户部核实','厂卫与言官互攻，需亲裁边界'],
      life:['幼承大统','内廷权力上升','朝廷辽事压迫皇权裁断'],
      memories:['魏忠贤请以厂卫查风闻','孙承宗主张先饷后兵','张嫣提醒宫中言语未必皆实'],
      impressions:['对清流：可信但多牵制','对阉党：可用但不可纵','对边臣：急切而难控'],
      risks:['过度依赖内廷会激化外朝疑惧','迟拨辽饷会损皇威与军心'],
      relations:{zhangyan:82,weizhongxian:68,sunchengzong:58,yuanchonghuan:50,maoyilu:35},
      relationTags:{zhangyan:'中宫',weizhongxian:'倚任',sunchengzong:'可召',yuanchonghuan:'边事',maoyilu:'地方'}
    },
    {
      id:'zhangyan', name:'张嫣', courtesy:'祖娥', portrait:'img/portraits/ming-empress-ai.png',
      role:'皇后', roleType:'harem', office:'中宫皇后', rank:'中宫', age:17, gender:'女',
      faction:'后宫', location:'中宫', status:'在宫', alive:true, importance:76,
      loyalty:86, ambition:42, stress:38, health:82,
      stats:{智:70,政:58,武:12,交:76,工:45,仁:82},
      traits:['谨慎','端肃','宫中耳目','守礼'],
      flags:['可私问','可入后宫线','记忆敏感'],
      goal:'稳住中宫，避免内廷风闻牵动圣意。',
      bio:'张嫣处中宫，虽少直接干政，却能感知宫中风向。她适合作为私下问对与内廷记忆的入口。',
      appearance:'凤冠简重，眉目清肃，言辞少而不轻许。',
      dualIdentity:'皇后 / 宫中信息节点',
      family:{origin:'河南祥符', father:'张国纪', mother:'未录', spouse:'朱由校', children:'未录', heir:'未录', clan:'张氏'},
      resources:{public:'中宫仪制与后宫秩序', private:'宫人耳目、内廷声望', retainers:'女官、尚宫局', reputation:'端谨贤名'},
      works:['中宫训诫','后宫赏罚簿'],
      career:['册立中宫','整肃宫内流言','以私下问对提醒内廷风险'],
      life:['入宫','立后','卷入内廷与外朝风闻'],
      memories:['听闻司礼监借辽饷试探圣意','曾劝皇帝慎听内廷急报'],
      impressions:['对魏忠贤：可疑而不可明拒','对皇帝：忧其孤断','对外廷：言多而心未齐'],
      risks:['后宫线索公开会伤中宫威望','与内廷冲突会引发风闻'],
      relations:{player:82,weizhongxian:30,sunchengzong:54,yuanchonghuan:42,maoyilu:28},
      relationTags:{player:'夫妻',weizhongxian:'提防',sunchengzong:'敬重',yuanchonghuan:'闻名',maoyilu:'无交'}
    },
    {
      id:'weizhongxian', name:'魏忠贤', courtesy:'完吾', portrait:'img/portraits/ming-eunuch-ai.png',
      role:'权宦', roleType:'inner', office:'司礼监掌印', rank:'内廷枢纽', age:55, gender:'男',
      faction:'阉党', location:'内廷', status:'掌权', alive:true, importance:94,
      loyalty:58, ambition:92, stress:46, health:70,
      stats:{智:75,政:80,武:42,交:84,工:55,仁:20},
      traits:['权谋','厂卫','结党','急进'],
      flags:['可问对','可查风闻','高风险'],
      goal:'排除异己，巩固司礼监与厂卫对朝局的控制。',
      bio:'魏忠贤是内廷权力的枢纽。其资源强，但外廷疑惧也高，任何行动都可能触发党争。',
      appearance:'袍服华重，目光锐利，常以低声急语进言。',
      dualIdentity:'内廷管钥 / 党争节点 / 厂卫通道',
      family:{origin:'肃宁', father:'未录', mother:'未录', spouse:'无', children:'义子门下多人', heir:'未录', clan:'魏氏'},
      resources:{public:'司礼监批红、厂卫线索', private:'门下义子、内廷赏赐', retainers:'厂卫番役、阉党官员', reputation:'权势极盛，士林疑惧'},
      works:['批红留痕','厂卫风闻册'],
      career:['入司礼监','掌印得宠','借辽饷风闻压制外廷'],
      life:['市井入宫','渐掌内廷','阉党成势'],
      memories:['言官借辽饷攻内库','厂卫截闻外廷私议','皇帝仍需其执行速度'],
      impressions:['对皇帝：可亲近但须固宠','对清流：敌意深','对边臣：只看其能否服从'],
      risks:['动用厂卫过频会损吏治与民心','结党过深会引爆清流反扑'],
      relations:{player:68,zhangyan:30,sunchengzong:18,yuanchonghuan:32,maoyilu:52},
      relationTags:{player:'倚任',zhangyan:'互疑',sunchengzong:'政敌',yuanchonghuan:'试探',maoyilu:'可用'}
    },
    {
      id:'sunchengzong', name:'孙承宗', courtesy:'稚绳', portrait:'img/portraits/ming-scholar-ai.png',
      role:'重臣', roleType:'court', office:'兵部尚书', rank:'二品', age:60, gender:'男',
      faction:'清流', location:'京师', status:'在朝', alive:true, importance:88,
      loyalty:82, ambition:44, stress:51, health:67,
      stats:{智:85,政:76,武:78,交:66,工:48,仁:80},
      traits:['持重','边务','经世','师臣'],
      flags:['可召见','可入朝议','军政节点'],
      goal:'整顿辽东军务，先稳军饷，再议练兵。',
      bio:'孙承宗兼具军政经验，是辽东问题中最稳妥的朝臣节点。',
      appearance:'须发苍然，衣冠整肃，奏对时语慢而意坚。',
      dualIdentity:'阁臣声望 / 兵部军政 / 清流桥梁',
      family:{origin:'高阳', father:'未录', mother:'未录', spouse:'未录', children:'子侄在籍', heir:'未录', clan:'孙氏'},
      resources:{public:'兵部题本、军务名册', private:'门生故吏、士林声望', retainers:'兵部属官、辽东将吏', reputation:'持重可信'},
      works:['边务疏议','辽东军政条陈'],
      career:['入阁讲读','督理兵部','主张先饷后兵'],
      life:['科第入仕','讲筵近臣','边务重任'],
      memories:['宁远饷路迟滞','户部核销疑点','边臣急而朝议缓'],
      impressions:['对皇帝：需直言但避激怒','对魏忠贤：不可同谋','对袁崇焕：可用须约束'],
      risks:['清流声望会牵动党争','军政方案见效慢'],
      relations:{player:58,zhangyan:54,weizhongxian:18,yuanchonghuan:76,maoyilu:46},
      relationTags:{player:'可召',zhangyan:'敬重',weizhongxian:'政敌',yuanchonghuan:'器重',maoyilu:'同朝'}
    },
    {
      id:'yuanchonghuan', name:'袁崇焕', courtesy:'元素', portrait:'img/portraits/ming-general-ai.png',
      role:'边臣', roleType:'frontier', office:'辽东巡抚', rank:'边镇巡抚', age:39, gender:'男',
      faction:'边镇', location:'宁远', status:'边任', alive:true, importance:84,
      loyalty:74, ambition:68, stress:73, health:75,
      stats:{智:78,政:63,武:86,交:55,工:42,仁:58},
      traits:['敢任','火器','急切','守城'],
      flags:['可传书','军务紧急','远离京师'],
      goal:'守宁远，补军饷，维持边镇士气。',
      bio:'袁崇焕身处辽东一线，传书、军饷、火器与朝廷信任都会影响他的后续行动。',
      appearance:'甲衣常带风尘，眉目锐利，言辞多急而有锋。',
      dualIdentity:'边臣 / 将领 / 朝廷信任试金石',
      family:{origin:'东莞', father:'未录', mother:'未录', spouse:'未录', children:'未录', heir:'未录', clan:'袁氏'},
      resources:{public:'辽东军册、宁远城防', private:'亲兵、将门声望', retainers:'宁远诸将、火器匠役', reputation:'敢战有名，朝中议论未定'},
      works:['宁远守议','火器营册'],
      career:['进士入仕','巡抚辽东','宁远守御待饷'],
      life:['岭南出身','北上任边','卷入辽东军饷危机'],
      memories:['药铅只可支一旬','登莱迟援会先乱边堡','朝廷信任不足'],
      impressions:['对皇帝：望其速断','对孙承宗：可信赖','对魏忠贤：疑其借事拿人'],
      risks:['军饷拖延会迅速提升压力','越权催调会触发朝议弹劾'],
      relations:{player:50,zhangyan:42,weizhongxian:32,sunchengzong:76,maoyilu:28},
      relationTags:{player:'待信',zhangyan:'闻名',weizhongxian:'互疑',sunchengzong:'师援',maoyilu:'无交'}
    },
    {
      id:'maoyilu', name:'毛一鹭', courtesy:'序臣', portrait:'img/portraits/ming-civil-ai.png',
      role:'地方官', roleType:'local', office:'苏州知府', rank:'四品', age:46, gender:'男',
      faction:'浙党', location:'苏州', status:'地方任', alive:true, importance:63,
      loyalty:60, ambition:56, stress:64, health:76,
      stats:{智:60,政:66,武:25,交:61,工:54,仁:48},
      traits:['地方财赋','织造','漕运','权衡'],
      flags:['可奏疏','地方线索','财赋相关'],
      goal:'在织造、漕运与民力之间求平衡。',
      bio:'毛一鹭代表江南地方压力。其奏疏常牵动财赋、民心与漕运。',
      appearance:'衣冠富丽而神色谨慎，谈财赋时多留余地。',
      dualIdentity:'地方官 / 财赋承压者 / 江南士绅接口',
      family:{origin:'浙江遂安', father:'未录', mother:'未录', spouse:'未录', children:'未录', heir:'未录', clan:'毛氏'},
      resources:{public:'苏州府库、漕运册', private:'地方士绅关系、织造渠道', retainers:'府吏、粮长、商贾', reputation:'能办事但被疑善权衡'},
      works:['江南漕报','织造民力条陈'],
      career:['地方历任','苏州知府','奏请宽催漕粮'],
      life:['科举入仕','江南理财','夹在织造与民力之间'],
      memories:['粮船迟缓，船户怨声渐起','富户隐匿，贫民逃散','户部催迫甚急'],
      impressions:['对皇帝：望宽限','对魏忠贤：可周旋','对清流：多监督少体恤'],
      risks:['严催会伤民心','宽限会损国帑与皇威'],
      relations:{player:35,zhangyan:28,weizhongxian:52,sunchengzong:46,yuanchonghuan:28},
      relationTags:{player:'疏远',zhangyan:'无交',weizhongxian:'周旋',sunchengzong:'同朝',yuanchonghuan:'无交'}
    }
  ];

  const familyProfiles = {
    player: {
      familyTier:'imperial', clanPrestige:88, motherClan:'王氏', spouseClan:'张氏',
      familyMembers:[
        {name:'朱载垕', relation:'祖父', generation:-2, title:'穆宗皇帝', age:35, dead:true},
        {name:'朱常洛', relation:'父', generation:-1, title:'光宗皇帝', age:38, dead:true},
        {name:'王才人', relation:'母', generation:-1, title:'孝和皇太后', family:'王氏', inLaw:true, dead:true},
        {name:'朱由检', relation:'皇弟', generation:0, title:'信王', age:16},
        {name:'张嫣', relation:'皇后', generation:0, title:'中宫皇后', family:'张氏', inLaw:true, age:17},
        {name:'皇子未立', relation:'嗣统', generation:1, title:'待定', note:'继承隐忧'}
      ]
    },
    zhangyan: {
      familyTier:'gentry', clanPrestige:62, motherClan:'未录', spouseClan:'皇明朱氏',
      familyMembers:[
        {name:'张国纪', relation:'父', generation:-1, title:'国丈', age:48},
        {name:'朱由校', relation:'夫', generation:0, title:'大明皇帝', family:'皇明朱氏', inLaw:true, age:18},
        {name:'张氏族亲', relation:'同族', generation:0, title:'外戚', age:32},
        {name:'皇子未立', relation:'子嗣', generation:1, title:'待定', note:'继承隐忧'}
      ]
    },
    weizhongxian: {
      familyTier:'common', clanPrestige:46, motherClan:'未录', spouseClan:'',
      familyMembers:[
        {name:'魏氏父老', relation:'父辈', generation:-1, title:'未仕', dead:true},
        {name:'魏良卿', relation:'侄', generation:0, title:'锦衣卫都督', age:34},
        {name:'门下义子', relation:'义子', generation:1, title:'厂卫番役', age:24},
        {name:'阉党门生', relation:'门下', generation:1, title:'内廷用事', age:31}
      ]
    },
    sunchengzong: {
      familyTier:'gentry', clanPrestige:74, motherClan:'未录', spouseClan:'',
      familyMembers:[
        {name:'孙氏先祖', relation:'祖辈', generation:-2, title:'高阳望族', dead:true},
        {name:'孙氏父', relation:'父', generation:-1, title:'乡贤', dead:true},
        {name:'孙承宗', relation:'本人', generation:0, title:'兵部尚书', age:60},
        {name:'孙氏子侄', relation:'子侄', generation:1, title:'诸生', age:24},
        {name:'门生辽将', relation:'门生', generation:1, title:'边务幕佐', age:33}
      ]
    },
    yuanchonghuan: {
      familyTier:'gentry', clanPrestige:58, motherClan:'未录', spouseClan:'',
      familyMembers:[
        {name:'袁氏先人', relation:'祖辈', generation:-2, title:'东莞士族', dead:true},
        {name:'袁父', relation:'父', generation:-1, title:'乡绅', dead:true},
        {name:'袁氏族弟', relation:'族弟', generation:0, title:'幕友', age:28},
        {name:'袁氏子侄', relation:'子侄', generation:1, title:'未仕', age:12}
      ]
    },
    maoyilu: {
      familyTier:'gentry', clanPrestige:55, motherClan:'未录', spouseClan:'江南士绅',
      familyMembers:[
        {name:'毛氏先人', relation:'祖辈', generation:-2, title:'遂安士族', dead:true},
        {name:'毛父', relation:'父', generation:-1, title:'乡绅', dead:true},
        {name:'江南姻族', relation:'妻族', generation:0, title:'士绅', family:'江南士绅', inLaw:true, age:40},
        {name:'毛氏子侄', relation:'子侄', generation:1, title:'诸生', age:18}
      ]
    }
  };

  const officialFieldProfiles = {
    player: {
      name:'朱由检', courtesy:'', title:'明思宗·崇祯帝', officialTitle:'皇帝', office:'皇帝', rank:'九五至尊', rankLevel:0,
      role:'皇帝', roleType:'sovereign', class:'宗室', occupation:'皇室', age:17, birthYear:1611, birthplace:'北京·慈庆宫',
      location:'京师·紫禁城·乾清宫', status:'初登大宝', faction:'明朝廷', familyName:'朱氏·明', familyTier:'imperial',
      father:'朱常洛', mother:'刘氏', spouse:'周皇后', playerRelation:'本人', ethnicity:'汉', faith:'儒', culture:'汉',
      learning:'皇子·经筵', speechStyle:'文言凝重，用“朕”“尔等”。发怒时语短而直。', diction:'辞令凝重，出语果断，然时有迟疑。',
      stance:'中兴之主', loyalty:100, ambition:90, stress:62, health:78, intelligence:82, valor:52, military:40,
      administration:62, management:55, charisma:55, diplomacy:42, benevolence:52, integrity:82, clanPrestige:100,
      traitIds:['ambitious','diligent','paranoid','impatient'], traits:['刚烈','勤政','多疑','急切'],
      wuchangOverride:{仁:55,义:70,礼:75,智:72,信:50},
      resources:{privateWealth:{money:180000,grain:4000,cloth:1200},publicPurse:{money:0,grain:0,cloth:0},fame:72,virtueMerit:15,health:78,stress:62},
      goal:'中兴大明，重整吏治，扫平虏寇；保祖宗宗庙于不坠。',
      personalGoal:'中兴大明，重整吏治，扫平虏寇；保祖宗宗庙于不坠。',
      personalGoals:[
        {type:'protect',longTerm:'守祖宗江山、避免亡国',shortTerm:'立即除阉党',priority:10,progress:0},
        {type:'power',longTerm:'重整吏治·恢复圣君亲裁格局',shortTerm:'起用东林韩爌等老臣',priority:7,progress:0}
      ],
      career:[
        {year:1622,title:'信王',desc:'天启二年五岁封信王。',milestone:false},
        {year:1627,title:'皇帝',desc:'天启七年八月即位。',milestone:true}
      ],
      familyMembers:[
        {name:'朱由校',relation:'兄长',title:'明熹宗，天启七年八月崩',generation:0,dead:true},
        {name:'张懿安',relation:'嫂',title:'熹宗皇后',generation:0,inLaw:true},
        {name:'周皇后',relation:'妻',title:'信王妃',generation:0},
        {name:'朱常洛',relation:'父',title:'明光宗',generation:-1,dead:true}
      ],
      hobbies:'读书,书法,骑射,研兵',
      stressSources:['阉党盘踞内外','辽东军饷告急','陕西饥民将起','兄嫂未育血脉'],
      innerThought:'祖宗二百六十年江山，岂能毁于朕手？然九千岁爪牙满朝，朕孤身入此乾清宫。',
      _memory:[
        {event:'兄长熹宗落水染疾崩于乾清宫，遗命“吾弟当为尧舜”。',emotion:'悲',weight:10,turn:0},
        {event:'即位次日，魏忠贤叩首请辞司礼监，温言慰留以观其党心。',emotion:'惧',weight:8,turn:0},
        {event:'读天启朝诏狱旧档，杨涟二十四罪疏血泪俱下。',emotion:'怒',weight:9,turn:0}
      ],
      appearance:'面目清癯，额高鼻直，目光锐利。十七岁身高已成，然身量偏瘦。',
      bio:'明熹宗朱由校之弟，封信王。天启七年八月即位，刚烈而猜忌，急于有为。承国危之秋，仰天问计而孑然孤影。',
      historicalSources:['《明史·本纪·庄烈帝》：鸡鸣而起，夜分不寐，往往焦劳成疾。','《国榷》：性多猜忌，所用必其亲信之人。','谈迁《国榷》：勤敏性刚，而抑情以近儒风。'],
      skills:['经筵读书','朱批奏疏','观兵演阵','诵经祈福'],
      secret:'实未与长兄熹宗确证其溺水之因，魏忠贤或客氏有无加害，一念犹疑。',
      aiPersonaText:'十七岁嗣位之君，刚烈急切，骨子里藏深重不安。所以多疑，所以勤政。',
      valueSystem:'祖宗江山第一；吏治第二；臣节第三。', behaviorMode:'急进·高压·多疑·勤政',
      sourceRelations:{
        '魏忠贤':{affinity:15,trust:5,respect:20,fear:85,hostility:40,labels:['权阉','待除之奸']},
        '张懿安':{affinity:70,trust:80,respect:85,fear:0,hostility:0,labels:['嫂叔','清议之盟']},
        '孙承宗':{affinity:80,trust:85,respect:90,fear:0,hostility:0,labels:['帝师','托付重任']},
        '袁崇焕':{affinity:65,trust:60,respect:80,fear:5,hostility:0,labels:['欲任辽事']},
        '王承恩':{affinity:85,trust:95,respect:55,fear:0,hostility:0,labels:['主仆至亲']}
      }
    },
    zhangyan: {
      name:'张懿安', courtesy:'', title:'懿安皇后·皇嫂', officialTitle:'懿安皇后', office:'懿安皇后', rank:'中宫旧主', rankLevel:18,
      role:'皇嫂', roleType:'harem', class:'宗室', occupation:'皇室', age:22, birthplace:'河南·祥符',
      location:'京师·紫禁城·慈宁宫', status:'慈宁宫', faction:'明朝廷', party:'东林党', partyRank:'成员', familyName:'张氏',
      familyTier:'imperial', father:'张国纪', spouse:'朱由校(殁)', spouseRank:'empress', playerRelation:'嫂叔',
      ethnicity:'汉', faith:'儒', culture:'汉', learning:'《女诫》《列女传》', speechStyle:'端凝肃穆。称新帝“陛下”亦称“叔”。',
      diction:'严正有礼，不妄言笑。', stance:'清流', loyalty:90, ambition:30, stress:20, health:80, intelligence:80,
      valor:18, military:57, administration:62, management:58, charisma:70, diplomacy:65, benevolence:80, integrity:95,
      traitIds:['just','honest','stubborn','compassionate'], traits:['严正','诚直','执拗','慈悯'],
      wuchangOverride:{仁:70,义:90,礼:90,智:80,信:92},
      resources:{privateWealth:{money:85000,grain:3000,cloth:800},publicPurse:{money:0,grain:0,cloth:0},fame:0,virtueMerit:55,health:80,stress:20},
      goal:'扶新帝速除客魏，保先帝遗愿与张氏体面。', personalGoal:'扶新帝速除客魏，保先帝遗愿与张氏体面。',
      career:[{year:1621,title:'皇后',desc:'天启元年十五岁册立。'},{year:1627,title:'懿安皇后',desc:'熹宗崩后尊号。'}],
      familyMembers:[
        {name:'朱由校',relation:'夫(殁)',title:'明熹宗',generation:0,dead:true},
        {name:'朱由检',relation:'小叔',title:'崇祯帝',generation:0},
        {name:'张国纪',relation:'父',title:'太康伯',generation:-1},
        {name:'张国瑞',relation:'兄',title:'张氏宗亲',generation:0}
      ],
      hobbies:'读《孝经》,佛经', stressSources:['夫殁无后','客氏诅咒阴魂','阉党余威','信邸叔嫂分际'],
      innerThought:'熹宗一生被客魏所蔽，死不瞑目。新帝必除此二凶；若过冬不决，吾亦不得安。',
      _memory:[{event:'熹宗在世时屡劝除客氏魏忠贤；客氏诬后流产怀仇。',emotion:'恨',weight:9,turn:0}],
      appearance:'体态丰润，端凝有威仪。', bio:'熹宗皇后，河南祥符人。素恶魏忠贤与客氏，多次劝熹宗除阉。新帝即位，可咨其计。',
      historicalSources:['《明史·后妃传》：后性严正，数于帝前言客氏、忠贤过。','《明史》：客、魏深疾之。','《明史》：甲申之变，自尽于寿宁宫。'],
      skills:['女德教化','掌六宫','识人辨奸'], secret:'熹宗曾私语“客氏毒我也”，临终前一刻方告张懿安。',
      valueSystem:'先帝遗愿；张氏体面；反阉复仇。', behaviorMode:'刚直·深仇·献策',
      sourceRelations:{'朱由检':{affinity:75,trust:80,respect:85,fear:5,hostility:0,labels:['嫂叔','献策']},'魏忠贤':{affinity:0,trust:0,respect:5,fear:70,hostility:90,labels:['国贼','必欲除之']}}
    },
    weizhongxian: {
      officialTitle:'司礼监秉笔太监·提督东厂', title:'司礼监秉笔·提督东厂·上公', office:'司礼监秉笔太监·提督东厂', rank:'内廷上公', rankLevel:7,
      role:'内廷首宦', age:59, birthYear:1568, birthplace:'北直隶·肃宁', location:'京师·紫禁城·司礼监', status:'权势将倾',
      faction:'明朝廷', party:'阉党', partyRank:'首领·上公', familyName:'魏氏(义子义孙满朝)', familyTier:'common', clanPrestige:25,
      occupation:'宦官', playerRelation:'待除之奸', ethnicity:'汉', faith:'民间/自立生祠', culture:'汉', learning:'白身·不识字',
      speechStyle:'粗豪市井之语。见帝则匍匐，私下骂人泼辣。', diction:'粗豪直率，然善察言观色', stance:'权阉·篡权之渐',
      loyalty:10, ambition:98, stress:92, health:68, intelligence:72, valor:42, military:58, administration:55, management:85,
      charisma:62, diplomacy:48, benevolence:5, integrity:3, traitIds:['deceitful','ambitious','callous','vengeful','gregarious','paranoid','arbitrary','greedy'],
      traits:['权谋','九千岁','厂卫','贪婪','多疑'], wuchangOverride:{仁:5,义:10,礼:15,智:72,信:20},
      resources:{privateWealth:{money:4800000,grain:60000,cloth:28000},publicPurse:{money:3000000,grain:100000,cloth:50000},fame:-50,virtueMerit:-80,health:68,stress:92},
      goal:'延续阉党之局，身后亦不许清算。', personalGoal:'延续阉党之局，身后亦不许清算。',
      career:[{year:1589,title:'入宫充饷',desc:'二十一岁因赌博欠债入宫。'},{year:1620,title:'司礼监秉笔',desc:'熹宗即位后逐王安。',milestone:true},{year:1623,title:'提督东厂',desc:'兼掌厂卫。'},{year:1625,title:'上公',desc:'赐“顾命元臣”印，生祠四起。'}],
      familyMembers:[
        {name:'客氏',relation:'对食',title:'内廷情侣二十年',generation:0},
        {name:'崔呈秀',relation:'义子',title:'五虎之首',generation:1},
        {name:'田尔耕',relation:'义子',title:'五彪之首·锦衣卫',generation:1},
        {name:'许显纯',relation:'义子',title:'北镇抚司·诛东林',generation:1},
        {name:'魏良卿',relation:'侄',title:'宁国公',generation:0}
      ],
      hobbies:'斗鸡,走狗,蹴鞠,观戏,诵佛', stressSources:['新帝年少而刚猜','客氏被逐','东林党人将归','田尔耕提督京营心思不齐'],
      innerThought:'客氏已出宫，是天变之前兆。急流勇退乎？然九千岁岂有余地？',
      _memory:[{event:'天启三年号“九千岁”，建生祠遍天下。',emotion:'喜',weight:10,turn:-1800},{event:'天启四年命锦衣卫诛杨涟、左光斗于诏狱。',emotion:'快',weight:9,turn:-1200},{event:'天启七年七月熹宗薨，信王入继，心知大变。',emotion:'惧',weight:10,turn:-30}],
      appearance:'身材短小，面白无须，瞳仁昏黄。常朝常戴珠冠。', bio:'直隶肃宁人。少无赖，自阉入宫。天启朝内外大权一归忠贤，义子义孙遍六部。新帝即位，客氏出宫，大势已摇。',
      historicalSources:['《明史·宦官传·魏忠贤》：少无赖，嗜酒博，与群恶少斗。','《明史·魏忠贤传》：内外大权一归忠贤。','《明季北略》：威福在手，生杀由心。'],
      skills:['朝中布网','东厂情报','笼络武将','矫旨行事'], superior:'实际无上司', mentor:'王安(殁)·早年恩主',
      secret:'内廷珍宝、金银、土地册籍藏于慈宁宫西偏殿密室。', valueSystem:'九千岁身份是命根。义子义孙是外藩。活着比名声重要。', behaviorMode:'阴狠·笼络·试探·暴起',
      sourceRelations:{'朱由检':{affinity:15,trust:5,respect:20,fear:85,hostility:40,labels:['新帝','惧其除己']},'张懿安':{affinity:0,trust:0,respect:5,fear:70,hostility:90,labels:['死敌','必欲除之']},'孙承宗':{affinity:5,trust:0,respect:40,fear:5,hostility:80,labels:['阉党排挤']}}
    },
    sunchengzong: {
      officialTitle:'辽东督师（已罢归）', title:'前辽东督师（闲居）', office:'辽东督师（已罢归）', rank:'旧督师', rankLevel:18,
      role:'帝师旧臣', roleType:'court', occupation:'武官', age:65, birthplace:'北直隶·高阳', location:'保定高阳', status:'罢归待召',
      faction:'明朝廷', familyName:'孙氏', familyTier:'common', playerRelation:'欲用之贤能', ethnicity:'汉', faith:'儒', culture:'北直隶',
      learning:'进士(榜眼)', speechStyle:'温温然如父教子。条理分明。', diction:'言必有据，教人如对圣贤。', stance:'主战稳守',
      loyalty:95, ambition:20, stress:20, health:80, intelligence:92, valor:72, military:90, administration:92, management:88, charisma:85, diplomacy:82, benevolence:80, integrity:95,
      traitIds:['honest','patient','calm','just'], traits:['持重','帝师','筑城','经世'], resources:{privateWealth:{money:50000,grain:10000,cloth:1000},publicPurse:{money:0,grain:0,cloth:0},fame:0,virtueMerit:85,health:80,stress:20},
      goal:'守关宁不失；训帝以尧舜之道。', personalGoal:'守关宁不失；训帝以尧舜之道。',
      career:[{year:1604,title:'榜眼',desc:'万历三十二年。',milestone:true},{year:1620,title:'詹事府少詹事',desc:'熹宗师傅。'},{year:1622,title:'兵部尚书·辽东督师',milestone:true},{year:1625,title:'罢归',desc:'被阉党排挤。'}],
      familyMembers:[{name:'孙鉁',relation:'长子',generation:1},{name:'孙钥',relation:'次子',generation:1},{name:'孙之沆',relation:'孙',generation:2},{name:'孙之浓',relation:'孙',generation:2}],
      hobbies:'山水游历,讲学,著述', stressSources:['年老','帝性急','阉党余党或反扑','辽东将领不齐心'],
      innerThought:'辽东筑宁远锦州是吾心血。老夫若不再起，五年复辽恐是空言。',
      _memory:[{event:'天启二年督师蓟辽，筑关宁防线。',emotion:'敬',weight:9,turn:-1600},{event:'天启五年被阉党排挤罢归。',emotion:'忧',weight:7,turn:-500}],
      appearance:'身长七尺，须髯如戟，方面广颡。', bio:'北直隶高阳人。万历三十二年进士。天启二年督师蓟辽，筑关宁防线。被阉党排挤，天启五年罢。',
      historicalSources:['《明史·孙承宗传》：承宗貌奇伟，须髯戟张。','《明史》：承宗以宰相行边，威望冠边镇。','《明史》：督师四年，前后修复大城九、堡四十五，练兵十一万。'],
      skills:['督师','筑城','兵学','讲经','识人'], secret:'书信告门人“今上虽勤而寡恩，袁帅性骄，恐不得善终”。', valueSystem:'国事高于个人；长城坚固高于战功；帝师本分。', behaviorMode:'稳重·长考·不争',
      sourceRelations:{'朱由检':{affinity:80,trust:85,respect:90,fear:0,hostility:0,labels:['曾为熹宗师','新帝尊之']},'袁崇焕':{affinity:90,trust:85,respect:90,fear:0,hostility:0,labels:['所荐','爱将']},'魏忠贤':{affinity:5,trust:0,respect:40,fear:5,hostility:80,labels:['阉党排挤']}}
    },
    yuanchonghuan: {
      officialTitle:'辽东巡抚（已丁忧归乡）', title:'前辽东巡抚（闲居）', office:'辽东巡抚（已丁忧归乡）', rank:'前巡抚', rankLevel:18,
      role:'边臣', roleType:'frontier', age:43, birthplace:'广东·东莞(籍广西藤县)', location:'广东东莞', status:'丁忧归乡',
      faction:'明朝廷', familyName:'袁氏', familyTier:'gentry', playerRelation:'欲用之贤能', ethnicity:'汉', faith:'儒', culture:'岭南',
      learning:'进士', speechStyle:'雄论滔滔，“五年”“立可”“必”字频出。', diction:'雄辩豪语，言“五年复辽”立见胸次。', stance:'主战复辽',
      loyalty:82, ambition:72, stress:20, health:80, intelligence:82, valor:82, military:88, administration:68, management:62, charisma:72, diplomacy:45, benevolence:60, integrity:80,
      traitIds:['ambitious','brave','arrogant','impatient'], traits:['敢任','火器','自负','急切'], resources:{privateWealth:{money:20000,grain:5000,cloth:500,land:800},publicPurse:{money:0,grain:0,cloth:0},fame:0,virtueMerit:45,health:80,stress:20},
      goal:'五年复辽东，封侯赐剑，平北虏。', personalGoal:'五年复辽东，封侯赐剑，平北虏。',
      career:[{year:1619,title:'进士',desc:'万历四十七年。',milestone:true},{year:1622,title:'兵部职方司主事',desc:'单骑出关。'},{year:1626,title:'宁远大捷'},{year:1627,title:'宁锦大捷'}],
      familyMembers:[{name:'袁文炳',relation:'父',title:'贡生',generation:-1},{name:'袁崇煜',relation:'兄',generation:0},{name:'黄氏',relation:'妻',generation:0,inLaw:true},{name:'袁兆基',relation:'子',generation:1}],
      hobbies:'骑射,读史,饮酒', stressSources:['阉党余孽谗于帝','毛文龙不听节制','辽饷不继','辽将人心'],
      innerThought:'宁远一炮退老奴，宁锦再退黄台吉。新帝召我，我当五年清辽东。',
      _memory:[{event:'宁远一役，红衣大炮退努尔哈赤。',emotion:'骄',weight:10,turn:-800},{event:'宁锦战后功不录赏，愤而告归。',emotion:'愤',weight:9,turn:-200}],
      appearance:'中等身量，黎黑多须，目射精光。', bio:'广东东莞人。万历四十七年进士。天启六年宁远大捷。天启七年宁锦战功不录，愤而告归。',
      historicalSources:['《明史·袁崇焕传》：崇焕为人慷慨负胆略，好谈兵。','《明史》：崇焕长躯鹤立，面目刚厉有光。','《国榷》：五年复辽之议出于激切。'],
      skills:['火器指挥','城守','练兵','断事决行'], secret:'在宁远围城时误将友军当后金军攻击，致数十人死。此事未入档册。',
      valueSystem:'辽事第一；兵权不容分；同僚可同袍亦可敌。', behaviorMode:'急进·独断·刚猛',
      sourceRelations:{'朱由检':{affinity:75,trust:70,respect:80,fear:15,hostility:0,labels:['五年复辽','托付重任']},'孙承宗':{affinity:90,trust:85,respect:95,fear:0,hostility:0,labels:['恩师','荐主']},'魏忠贤':{affinity:10,trust:5,respect:20,fear:10,hostility:60,labels:['阉党旧怨']}}
    },
    maoyilu: {
      courtesy:'公彦', haoName:'永轩', officialTitle:'应天巡抚·都察院右副都御史', title:'应天巡抚', office:'应天巡抚·都察院右副都御史', rank:'四品', rankLevel:4,
      role:'南京督抚·兼按察', roleType:'local', occupation:'文官', age:50, birthYear:1578, birthplace:'浙江·严州府·遂安县', location:'南京', status:'江南承压',
      faction:'明朝廷', party:'阉党', partyRank:'南京·地方魁首', familyName:'遂安毛氏', familyTier:'gentry', clanPrestige:25,
      ethnicity:'汉', faith:'儒', culture:'江南·严州', learning:'万历三十二年进士·授庶吉士', diction:'言辞委婉·遇事推诿·惧见民面。', stance:'阉党督抚·建祠急先锋',
      loyalty:28, ambition:68, stress:20, health:58, intelligence:62, valor:20, military:50, administration:58, management:55, charisma:57, diplomacy:50, benevolence:20, integrity:12,
      traitIds:['ambitious','deceitful','craven','paranoid'], traits:['建祠','推诿','惧祸','阉党'], resources:{privateWealth:{money:120000,grain:2500,cloth:800},publicPurse:{money:0,grain:0,cloth:0},fame:-70,virtueMerit:-90,health:58,stress:20},
      goal:'归遂安·避民祭·求死于宅中非街头。', personalGoal:'归遂安·避民祭·求死于宅中非街头。',
      career:[{year:1604,title:'进士·馆选庶吉士',milestone:true},{year:1614,title:'南京礼科给事中'},{year:1620,title:'太仆寺少卿'},{year:1626,title:'应天巡抚'}],
      familyMembers:[{name:'毛三奇',relation:'弟',title:'遂安乡官',generation:0},{name:'毛一鹗',relation:'族兄',title:'万历末进士',generation:0}],
      hobbies:'书法临帖·避事', stressSources:['苏州五人墓成民祭之所','江南士民憎之','阉党倒下后必清算建祠之罪'],
      innerThought:'苏州五人殉难后，我每夜梦颜佩韦五人持刀索命。此局必倒，倒前能否归浙亲先？',
      _memory:[{event:'天启六年苏州市民五人殉难，义葬虎丘。',emotion:'惧',weight:10,turn:-300},{event:'天启七年八月闻帝崩，夜不能寐。',emotion:'惧',weight:10,turn:-30}],
      appearance:'中瘦，青衣乌纱，走路微驼，恐惶时出冷汗。', bio:'浙江遂安人。万历三十二年进士。应天巡抚、阉党。天启六年奏建魏忠贤生祠于苏州，激起苏州五人墓事件。',
      historicalSources:['《明史·阉党传》载天启年间建祠诸臣事。','苏州五人墓相关史事：缇骑入吴、义民殉难。','天启末阉党败局，地方建祠者多遭清议追论。'],
      skills:['地方财赋','建祠动员','江南官场周旋'], superior:'魏忠贤·崔呈秀', valueSystem:'避祸第一；财赋第二；名节已失。', behaviorMode:'畏缩·推诿·求退'
    }
  };

  persons.forEach(p => {
    const extra = familyProfiles[p.id] || {};
    const official = officialFieldProfiles[p.id] || {};
    Object.assign(p, official);
    p.familyTier = official.familyTier || extra.familyTier || 'gentry';
    p.clanPrestige = official.clanPrestige ?? extra.clanPrestige ?? 50;
    p.motherClan = official.motherClan || extra.motherClan || p.family?.mother || p.mother || '';
    p.spouseClan = official.spouseClan || extra.spouseClan || p.spouse || p.family?.spouse || '';
    p.familyMembers = (official.familyMembers || extra.familyMembers || []).filter(m => m.name !== p.name || m.relation !== '本人');
    if(!p.personalGoal && p.goal) p.personalGoal = p.goal;
    if(p.personalGoal) p.goal = p.personalGoal;
    if(Array.isArray(p._memory)) p.memories = p._memory.map(m => typeof m === 'string' ? m : `${m.emotion ? '〔'+m.emotion+'〕' : ''}${m.event || m.desc || ''}`);
    if(!Array.isArray(p.impressions)) p.impressions = Object.entries(p.sourceRelations || {}).map(([name, rel]) => `${name}：${(rel.labels || []).join('、') || '有往来'} · 信任${rel.trust ?? '—'} / 敌意${rel.hostility ?? '—'}`);
  });

  const roleOptions = [
    ['all','全部身份'], ['sovereign','君主'], ['court','朝臣'], ['inner','内廷'],
    ['harem','后宫'], ['frontier','边臣'], ['local','地方']
  ];

  const tabs = [
    ['overview','总览'], ['dossier','档案'], ['career','仕途'], ['mind','心志'],
    ['relations','关系'], ['memory','记忆'], ['family','家谱']
  ];

  const fieldCoverage = ['头部身份','可用操作','生死状态','基础档案','仕途官职','双重身份','外貌','家谱亲族','作品','特质','关系','经历','生平','历练','记忆','印象','后宫','继承','子嗣','父母','策名候选'];

  const candidates = [
    {name:'徐光启', type:'历史人物', check:'年代可入', route:'入朝 / 工部 / 西学'},
    {name:'卢象升', type:'历史人物', check:'需晚期剧本', route:'入野 / 军务潜才'},
    {name:'海瑞', type:'已故人物', check:'仅可入史', route:'传记 / 士林记忆'},
    {name:'玩家新建人物', type:'自创人物', check:'需校验重名', route:'入野 / 入仕 / 传闻'}
  ];

  function installPersonAtlasStyles(){
    if(document.getElementById('tm-person-atlas-upgrade-style')) return;
    const style = document.createElement('style');
    style.id = 'tm-person-atlas-upgrade-style';
    style.textContent = `
      .tm-person-rich-panel{left:34px!important;top:62px!important;width:min(1340px,calc(100vw - 118px))!important;height:min(838px,calc(100vh - 88px))!important;border-color:rgba(201,160,69,.34)!important;box-shadow:0 22px 60px rgba(0,0,0,.58),inset 0 1px 0 rgba(255,240,190,.08)!important;}
      .tm-person-rich{height:100%;display:grid;grid-template-columns:318px minmax(0,1fr) 318px;gap:10px;padding:12px;box-sizing:border-box;background:radial-gradient(ellipse at 50% -20%,rgba(196,154,70,.16),transparent 45%),linear-gradient(90deg,rgba(12,9,7,.98),rgba(30,22,16,.98) 24%,rgba(18,14,12,.98) 64%,rgba(12,9,7,.98));font-family:"STKaiti","KaiTi",serif;color:#eadfbd;}
      .tm-person-pane{min-height:0;border:1px solid rgba(201,160,69,.23);background:linear-gradient(180deg,rgba(255,246,214,.045),rgba(0,0,0,.18));box-shadow:inset 0 0 0 1px rgba(255,238,188,.025);border-radius:4px;scrollbar-color:rgba(201,160,69,.52) rgba(0,0,0,.22);}
      .tm-person-left{display:grid;grid-template-rows:auto auto auto auto auto minmax(0,1fr);gap:9px;padding:12px;overflow:hidden;}
      .tm-person-ledger-head{display:flex;align-items:center;justify-content:space-between;gap:10px;border-bottom:1px solid rgba(201,160,69,.18);padding-bottom:9px;}
      .tm-person-ledger-head b{display:block;color:#f5dc98;font-size:18px;font-weight:500;letter-spacing:.18em;}
      .tm-person-ledger-head span span{display:block;margin-top:3px;color:rgba(230,215,178,.56);font-size:10px;letter-spacing:.16em;}
      .tm-person-ledger-head small{color:rgba(126,184,167,.78);font-size:11px;white-space:nowrap;}
      .tm-person-title-line{display:flex!important;align-items:center;gap:10px;margin:0!important;}
      .tm-person-ceming-top{height:27px;border:1px solid rgba(213,103,73,.48);background:linear-gradient(180deg,rgba(128,48,34,.86),rgba(55,24,18,.92));color:#ffe1ac;font-family:inherit;font-size:12px;letter-spacing:.22em;padding:0 10px;cursor:pointer;box-shadow:inset 0 1px 0 rgba(255,232,180,.14),0 4px 12px rgba(0,0,0,.25);}
      .tm-person-ceming-top:hover{border-color:rgba(238,183,116,.72);filter:brightness(1.08);}
      .tm-person-counts{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px;}
      .tm-person-counts div{border:1px solid rgba(201,160,69,.13);background:rgba(0,0,0,.20);padding:6px 7px;min-width:0;}
      .tm-person-counts b{display:block;color:#f0d68d;font-size:15px;font-weight:500;}
      .tm-person-counts span{display:block;color:rgba(224,211,171,.48);font-size:10px;margin-top:2px;white-space:nowrap;}
      .tm-person-search{display:grid;gap:7px;margin-bottom:0;}
      .tm-person-filter-row{display:grid;grid-template-columns:1fr 1fr;gap:6px;}
      .tm-person-select,.tm-person-check{height:29px;border:1px solid rgba(201,160,69,.20);background:rgba(9,7,5,.72);color:#eadfbd;font-family:inherit;font-size:12px;padding:0 8px;min-width:0;}
      .tm-person-check{display:flex;align-items:center;gap:6px;cursor:pointer;color:rgba(232,220,187,.70);}
      .tm-person-list-shell{min-height:0;height:min(392px,100%);align-self:start;overflow:auto;padding-right:4px;}
      .tm-person-list{display:flex;flex-direction:column;gap:6px;}
      .tm-person-row{display:grid;grid-template-columns:46px minmax(0,1fr) 43px;gap:8px;align-items:center;min-height:64px;border:1px solid rgba(201,160,69,.18);background:linear-gradient(90deg,rgba(255,246,214,.05),rgba(0,0,0,.10));color:#eadfbd;padding:7px;cursor:pointer;text-align:left;border-radius:3px;font-family:inherit;}
      .tm-person-row.active{border-color:rgba(239,201,116,.58);box-shadow:inset 3px 0 rgba(180,54,37,.68);background:rgba(96,45,28,.26);}
      .tm-person-row:hover{border-color:rgba(226,190,109,.42);background:linear-gradient(90deg,rgba(126,184,167,.12),rgba(255,246,214,.04));}
      .tm-person-row img{width:44px;height:54px;object-fit:cover;border:1px solid rgba(201,160,69,.38);filter:saturate(.9);}
      .tm-person-row b{display:block;color:#f2d98d;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .tm-person-row span{display:block;margin-top:3px;color:rgba(224,211,171,.56);font-size:10.5px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .tm-person-row small{justify-self:end;color:rgba(224,211,171,.54);font-size:10px;border-left:1px solid rgba(201,160,69,.12);padding-left:7px;writing-mode:vertical-rl;letter-spacing:.12em;}
      .tm-person-row-meta{display:flex!important;gap:5px;align-items:center;margin-top:4px!important;color:rgba(224,211,171,.54)!important;}
      .tm-person-status-dot{width:6px;height:6px;border-radius:50%;background:#7eb8a7;box-shadow:0 0 9px rgba(126,184,167,.6);flex:0 0 auto;}
      .tm-person-status-dot.warn{background:#d4be7a;box-shadow:0 0 9px rgba(212,190,122,.55);}
      .tm-person-status-dot.dead{background:#8b8b8b;box-shadow:none;}
      .tm-person-main{padding:13px;display:grid;grid-template-rows:auto auto minmax(0,1fr);gap:9px;overflow:hidden;}
      .tm-person-head{display:grid;grid-template-columns:124px minmax(0,1fr);gap:13px;align-items:start;border-bottom:1px solid rgba(201,160,69,.20);padding:10px;background:linear-gradient(90deg,rgba(94,48,31,.18),transparent);}
      .tm-person-portrait{width:118px;height:158px;object-fit:cover;border:1px solid rgba(226,190,109,.58);box-shadow:0 10px 24px rgba(0,0,0,.42),0 0 0 4px rgba(0,0,0,.18);}
      .tm-person-title h2{margin:0;color:#f4dc96;font-size:25px;letter-spacing:.14em;font-weight:500;}
      .tm-person-title p{margin:6px 0;color:rgba(232,220,187,.68);font-size:12px;line-height:1.6;}
      .tm-person-command-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:6px;margin-top:9px;}
      .tm-person-command-strip div{border:1px solid rgba(201,160,69,.13);background:rgba(0,0,0,.18);padding:6px 7px;min-width:0;}
      .tm-person-command-strip span{display:block;color:rgba(224,211,171,.50);font-size:10px;}
      .tm-person-command-strip b{display:block;color:#eadfbd;font-size:12px;font-weight:400;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .tm-person-tabs{display:flex;flex-wrap:wrap;gap:6px;margin-bottom:0;}
      .tm-person-tabs button{flex:0 0 auto;min-width:58px;height:27px;padding:0 10px;border:1px solid rgba(201,160,69,.22);background:rgba(0,0,0,.22);color:rgba(232,220,187,.68);cursor:pointer;border-radius:2px;font-family:inherit;}
      .tm-person-tabs button.active{color:#f2d98d;border-color:rgba(201,160,69,.54);background:rgba(98,54,30,.28);}
      .tm-person-scroll{min-height:0;overflow:auto;padding-right:7px;}
      .tm-person-section{margin-bottom:12px;padding:11px;border:1px solid rgba(201,160,69,.16);background:rgba(255,245,210,.04);border-radius:3px;}
      .tm-person-section h3{margin:0 0 8px;color:#f0d68d;font-size:15px;letter-spacing:.16em;font-weight:500;}
      .tm-person-section-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;}
      .tm-person-section.wide{grid-column:1/-1;}
      .tm-person-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
      .tm-person-grid.three{grid-template-columns:repeat(3,minmax(0,1fr));}
      .tm-person-line{display:grid;grid-template-columns:74px minmax(0,1fr);gap:8px;border-bottom:1px solid rgba(201,160,69,.08);padding:6px 0;font-size:12px;}
      .tm-person-line span{color:rgba(224,211,171,.52);}
      .tm-person-line b{color:#eadfbd;font-weight:400;}
      .tm-person-mini-tags{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
      .tm-person-mini-tags span{border:1px solid rgba(201,160,69,.15);background:rgba(0,0,0,.18);color:rgba(232,220,187,.68);padding:3px 6px;font-size:10px;border-radius:2px;}
      .tm-res-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;}
      .tm-res-box{border:1px solid rgba(201,160,69,.14);background:rgba(0,0,0,.20);padding:9px 10px;border-radius:3px;min-width:0;}
      .tm-res-box span{display:block;color:rgba(224,211,171,.52);font-size:11px;margin-bottom:2px;}
      .tm-res-box b{display:block;color:#f0d68d;font-size:16px;font-weight:600;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .tm-res-box small{display:block;color:rgba(232,220,187,.52);font-size:11px;line-height:1.45;margin-top:2px;}
      .tm-ability-matrix{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;}
      .tm-ability-cell{border:1px solid rgba(201,160,69,.13);background:rgba(0,0,0,.18);padding:7px;border-radius:3px;}
      .tm-ability-cell span{display:flex;justify-content:space-between;gap:6px;color:rgba(224,211,171,.62);font-size:11px;margin-bottom:4px;}
      .tm-ability-cell b{color:#f0d68d;font-size:15px;font-weight:600;}
      .tm-ability-cell i{display:block;height:5px;background:rgba(255,255,255,.06);border:1px solid rgba(201,160,69,.11);}
      .tm-ability-cell i:before{content:"";display:block;width:var(--v);height:100%;background:linear-gradient(90deg,#7eb8a7,#d4be7a,#c95340);}
      .tm-person-prose{color:rgba(232,220,187,.70);font-size:12px;line-height:1.72;white-space:pre-wrap;}
      .tm-person-timeline{display:grid;gap:8px;}
      .tm-person-timeline-row{display:grid;grid-template-columns:58px minmax(0,1fr);gap:8px;border-left:2px solid rgba(201,160,69,.28);padding:3px 0 6px 10px;}
      .tm-person-timeline-row span{color:#c9a045;font-size:12px;}
      .tm-person-timeline-row b{color:#eadfbd;font-size:13px;font-weight:500;}
      .tm-person-timeline-row small{display:block;color:rgba(232,220,187,.54);font-size:11px;line-height:1.55;margin-top:2px;}
      .tm-person-right-note{font-size:11px;line-height:1.55;color:rgba(232,220,187,.58);margin-top:6px;}
      .tm-person-risk-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px;}
      .tm-person-risk-grid div{border:1px solid rgba(201,160,69,.12);background:rgba(0,0,0,.18);padding:6px;text-align:center;}
      .tm-person-risk-grid span{display:block;color:rgba(224,211,171,.48);font-size:10px;}
      .tm-person-risk-grid b{display:block;color:#eadfbd;font-size:14px;font-weight:500;}
      .tm-person-bar{display:grid;grid-template-columns:42px minmax(0,1fr) 30px;gap:7px;align-items:center;margin:7px 0;color:rgba(224,211,171,.62);font-size:11px;}
      .tm-person-bar i{height:6px;border:1px solid rgba(201,160,69,.15);background:rgba(255,255,255,.07);}
      .tm-person-bar i:before{content:"";display:block;height:100%;width:var(--v);background:linear-gradient(90deg,#7eb8a7,#d4be7a,#c95340);}
      .tm-person-card{border:1px solid rgba(201,160,69,.16);background:linear-gradient(180deg,rgba(255,246,214,.045),rgba(0,0,0,.13));border-radius:3px;padding:10px;}
      .tm-person-card b{display:block;color:#f2d98d;font-size:13px;}
      .tm-person-card p{margin:6px 0 0;color:rgba(232,220,187,.68);font-size:12px;line-height:1.58;}
      .tm-person-right{padding:12px;display:flex;flex-direction:column;gap:9px;overflow:auto;}
      .tm-person-right .tm-person-card{flex:0 0 auto;}
      .tm-person-right .tm-person-card:last-child{margin-bottom:8px;}
      .tm-person-action-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;}
      .tm-person-action-btn{min-height:34px;border:1px solid rgba(201,160,69,.25);background:linear-gradient(180deg,rgba(35,25,17,.92),rgba(13,10,8,.92));color:#eadfbd;font-family:inherit;cursor:pointer;}
      .tm-person-action-btn.primary{border-color:rgba(213,103,73,.55);background:linear-gradient(180deg,rgba(126,45,32,.88),rgba(58,25,18,.95));color:#ffe2ad;}
      .tm-person-action-btn:disabled{opacity:.35;cursor:not-allowed;filter:saturate(.5);}
      .tm-person-action-grid .span{grid-column:1/-1;}
      .tm-person-verdict{display:grid;grid-template-columns:54px minmax(0,1fr);gap:8px;align-items:center;margin-top:8px;padding:8px;border:1px solid rgba(201,160,69,.14);background:rgba(0,0,0,.20);}
      .tm-person-verdict strong{display:flex;align-items:center;justify-content:center;min-height:38px;color:#ffe2ad;border:1px solid rgba(213,103,73,.34);background:rgba(126,45,32,.23);font-size:13px;font-weight:500;letter-spacing:.08em;}
      .tm-person-verdict span{color:rgba(232,220,187,.62);font-size:11px;line-height:1.55;}
      .tm-person-actions{display:flex;flex-wrap:wrap;gap:7px;}
      .tm-person-actions button{min-height:29px;border:1px solid rgba(201,160,69,.24);background:rgba(18,13,10,.78);color:#eadfbd;padding:4px 10px;cursor:pointer;font-family:inherit;}
      .tm-person-actions button.primary{border-color:rgba(213,103,73,.52);background:linear-gradient(180deg,rgba(126,45,32,.86),rgba(58,25,18,.92));color:#ffe1ac;}
      .tm-person-note-list{display:grid;gap:7px;}
      .tm-person-note{border-left:2px solid rgba(126,184,167,.52);background:rgba(126,184,167,.08);padding:7px 8px;color:rgba(232,220,187,.72);font-size:12px;line-height:1.55;}
      .tm-person-tags{display:flex;flex-wrap:wrap;gap:6px;}
      .tm-person-tag{border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.16);color:rgba(232,220,187,.70);padding:4px 7px;font-size:11px;border-radius:2px;}
      .tm-person-field-pills{display:flex;flex-wrap:wrap;gap:5px;margin-top:8px;}
      .tm-person-field-pills span{border:1px solid rgba(126,184,167,.20);background:rgba(126,184,167,.07);color:#9fd4c5;padding:3px 6px;font-size:10px;border-radius:2px;}
      .tm-person-source-list{display:grid;gap:7px;margin-top:8px;}
      .tm-person-source-list div{border-left:2px solid rgba(201,160,69,.32);background:rgba(0,0,0,.16);padding:7px 8px;color:rgba(232,220,187,.64);font-size:11px;line-height:1.55;}
      .tm-person-scrollbox{max-height:198px;overflow:auto;padding-right:4px;}
      .tm-person-rel-row{display:grid;grid-template-columns:minmax(0,1fr) 72px 58px;gap:8px;align-items:center;border-bottom:1px solid rgba(201,160,69,.10);padding:7px 0;font-size:12px;}
      .tm-person-rel-row:last-child{border-bottom:0;}
      .tm-person-rel-row span{color:rgba(224,211,171,.58);}
      .tm-person-rel-row b{color:#eadfbd;font-weight:400;}
      .tm-person-rel-score{height:6px;border:1px solid rgba(201,160,69,.14);background:rgba(255,255,255,.06);}
      .tm-person-rel-score i{display:block;height:100%;width:var(--v);background:linear-gradient(90deg,#7eb8a7,#d4be7a,#c95340);}
      .tm-person-ceming-table{display:grid;gap:7px;}
      .tm-person-ceming-row{display:grid;grid-template-columns:70px minmax(0,1fr) 82px;gap:8px;align-items:center;border:1px solid rgba(201,160,69,.13);background:rgba(0,0,0,.16);padding:8px;font-size:12px;}
      .tm-person-ceming-row b{color:#f0d68d;font-weight:500;}
      .tm-person-ceming-row span{color:rgba(232,220,187,.66);}
      .rwp-ft-svg-wrap{padding:12px;background:linear-gradient(to bottom,rgba(0,0,0,.30),rgba(0,0,0,.20));border:1px solid rgba(184,154,83,.16);border-radius:5px;overflow:auto;}
      .rwp-ft-svg{width:100%;min-width:700px;height:auto;display:block;}
      .rwp-ft-legend{display:flex;justify-content:center;gap:18px;padding:10px;margin-top:10px;font-size:12px;color:rgba(224,211,171,.55);flex-wrap:wrap;background:rgba(0,0,0,.20);border:1px solid rgba(184,154,83,.10);border-radius:3px;}
      .rwp-ft-lg{display:inline-flex;align-items:center;gap:5px;letter-spacing:.1em;}
      .rwp-ft-lg-mark{display:inline-block;width:16px;height:10px;border-radius:2px;}
      .rwp-ft-lg-mark.self{background:rgba(184,154,83,.15);border:2px solid #d4be7a;}
      .rwp-ft-lg-mark.blood{background:rgba(0,0,0,.30);border:1px solid #b89a53;}
      .rwp-ft-lg-mark.inlaw{background:rgba(126,184,167,.05);border:1px dashed #7eb8a7;}
      .rwp-ft-lg-mark.dead{background:rgba(0,0,0,.40);border:1px solid #8a7332;opacity:.55;}
      .rwp-ft-clan-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;}
      .rwp-ft-clan-item{padding:10px 12px;background:rgba(0,0,0,.25);border:1px solid rgba(184,154,83,.15);border-radius:3px;text-align:center;min-width:0;}
      .rwp-ft-clan-lb{color:#c9a045;letter-spacing:.2em;font-size:12px;margin-bottom:2px;}
      .rwp-ft-clan-v-big{font-size:20px;color:#d4be7a;font-weight:600;margin:3px 0;font-variant-numeric:tabular-nums;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .rwp-ft-clan-bar{height:4px;background:rgba(255,255,255,.06);border-radius:2px;overflow:hidden;margin-top:6px;}
      .rwp-ft-clan-bar-fill{display:block;height:100%;background:linear-gradient(90deg,#8a7332,#d4be7a);}
      .tm-family-list{padding:10px 14px;background:rgba(0,0,0,.22);border:1px solid rgba(184,154,83,.14);border-radius:4px;}
      .tm-family-list-row{font-size:12px;color:rgba(232,220,187,.72);line-height:1.9;border-bottom:1px solid rgba(201,160,69,.08);padding:2px 0;}
      .tm-family-list-row:last-child{border-bottom:0;}
      .tm-family-list-row b{color:#d4be7a;font-weight:500;}
      .tm-person-ceming-panel{left:50%;top:50%;transform:translate(-50%,-50%);width:min(980px,calc(100vw - 96px));height:min(720px,calc(100vh - 116px));border-color:rgba(201,160,69,.38);}
      .tm-ceming-page{height:100%;display:grid;grid-template-rows:auto auto minmax(0,1fr);background:radial-gradient(ellipse at 50% 0,rgba(184,154,83,.13),transparent 44%),linear-gradient(180deg,rgba(28,20,14,.98),rgba(9,7,6,.98));font-family:"STKaiti","KaiTi",serif;color:#eadfbd;}
      .tm-ceming-head{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:18px 22px 12px;border-bottom:1px solid rgba(201,160,69,.18);}
      .tm-ceming-head h2{margin:0;color:#f4dc96;font-size:24px;font-weight:500;letter-spacing:.32em;}
      .tm-ceming-head p{margin:6px 0 0;color:rgba(232,220,187,.62);font-size:12px;letter-spacing:.12em;}
      .tm-ceming-mode{border:1px solid rgba(126,184,167,.38);color:#9fd4c5;background:rgba(126,184,167,.08);padding:5px 10px;font-size:12px;white-space:nowrap;}
      .tm-ceming-toolbar{display:flex;gap:8px;align-items:center;flex-wrap:wrap;padding:10px 22px;border-bottom:1px solid rgba(201,160,69,.14);background:rgba(0,0,0,.16);}
      .tm-ceming-toolbar button,.tm-ceming-toolbar select{height:29px;border:1px solid rgba(201,160,69,.22);background:rgba(10,8,6,.82);color:#eadfbd;font-family:inherit;padding:0 10px;}
      .tm-ceming-toolbar button.active{color:#f2d98d;border-color:rgba(201,160,69,.55);background:rgba(98,54,30,.28);}
      .tm-ceming-body{min-height:0;display:grid;grid-template-columns:minmax(0,1fr) 280px;gap:12px;padding:14px 22px 18px;overflow:hidden;}
      .tm-ceming-grid{min-height:0;overflow:auto;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;padding-right:6px;}
      .tm-ceming-card{border:1px solid rgba(201,160,69,.16);background:linear-gradient(180deg,rgba(255,246,214,.045),rgba(0,0,0,.14));padding:11px;border-radius:4px;}
      .tm-ceming-card b{display:block;color:#f0d68d;font-size:15px;margin-bottom:5px;}
      .tm-ceming-card p{margin:4px 0;color:rgba(232,220,187,.66);font-size:12px;line-height:1.6;}
      .tm-ceming-aside{min-height:0;overflow:auto;border:1px solid rgba(201,160,69,.16);background:rgba(0,0,0,.16);padding:12px;}
      .tm-ceming-aside h3{margin:0 0 8px;color:#f0d68d;font-size:14px;letter-spacing:.18em;font-weight:500;}
      @media (max-width:1180px){.tm-person-rich-panel{left:18px!important;width:calc(100vw - 74px)!important;}.tm-person-rich{grid-template-columns:284px minmax(0,1fr);}.tm-person-right{display:none;}}
    `;
    document.head.appendChild(style);
  }

  function chip(label, tone=''){
    return `<span class="tm-chip ${esc(tone)}">${esc(label)}</span>`;
  }

  function personLine(k, v){
    return `<div class="tm-person-line"><span>${esc(k)}</span><b>${esc(v ?? '未录')}</b></div>`;
  }

  function personBar(k, v){
    const n = Math.max(0, Math.min(100, Number(v) || 0));
    return `<div class="tm-person-bar"><span>${esc(k)}</span><i style="--v:${n}%"></i><b>${n}</b></div>`;
  }

  function valueLabel(value, fallback='未录'){
    if(value === false || value === null || value === undefined || value === '') return fallback;
    if(Array.isArray(value)) return value.length ? value.join('、') : fallback;
    return String(value);
  }

  function rankLabel(cur){
    if(cur.rank) return cur.rank;
    if(cur.rankLevel === 0) return '至尊';
    if(cur.rankLevel) return `品级 ${cur.rankLevel}`;
    return '未授';
  }

  function familyLabel(cur){
    const tierMap = {imperial:'皇族', noble:'世家', gentry:'士族', common:'寒门'};
    return `${cur.familyName || cur.family?.clan || cur.family?.origin || '未录'}${cur.familyTier ? ' · '+(tierMap[cur.familyTier] || cur.familyTier) : ''}`;
  }

  function purse(cur, key){
    const res = cur.resources || {};
    const obj = res[key] || {};
    return (obj && typeof obj === 'object') ? obj : {};
  }

  function resNumber(cur, key, fallback){
    const res = cur.resources || {};
    return Number(res[key] ?? cur[key] ?? fallback ?? 0);
  }

  function fmtAmount(v){
    const n = Number(v || 0);
    const abs = Math.abs(n);
    const sign = n < 0 ? '-' : '';
    if(abs >= 100000000) return sign + (abs/100000000).toFixed(1) + '亿';
    if(abs >= 10000) return sign + (abs/10000).toFixed(abs >= 100000 ? 0 : 1) + '万';
    return sign + Math.round(abs).toLocaleString();
  }

  function resourceTriplet(title, obj){
    const safe = obj || {};
    return `<div class="tm-res-box"><span>${esc(title)}</span><b>${fmtAmount(safe.money)} 贯</b><small>粮 ${fmtAmount(safe.grain)} 石 · 布 ${fmtAmount(safe.cloth)} 匹</small></div>`;
  }

  function listify(value){
    if(!value) return [];
    if(Array.isArray(value)) return value.filter(Boolean);
    return String(value).split(/[、，,;/]/).map(x => x.trim()).filter(Boolean);
  }

  function careerLabel(item){
    if(!item) return '';
    if(typeof item === 'string') return item;
    return `${item.year || item.date || ''}${item.year || item.date ? ' · ' : ''}${item.title || ''}${item.desc || item.note ? '：'+(item.desc || item.note) : ''}`;
  }

  function memoryLabel(item){
    if(!item) return '';
    if(typeof item === 'string') return item;
    return `${item.turn !== undefined ? 'T'+item.turn+' ' : ''}${item.emotion ? '〔'+item.emotion+'〕' : ''}${item.event || item.desc || ''}`;
  }

  function abilityEntries(cur){
    const map = [
      ['智力','intelligence','智'], ['武勇','valor','勇'], ['军事','military','军'],
      ['政务','administration','政'], ['管理','management','管'], ['魅力','charisma','魅'],
      ['外交','diplomacy','交'], ['仁厚','benevolence','仁'], ['廉介','integrity','廉']
    ];
    return map.map(([label,key,legacy]) => [label, Number(cur[key] ?? cur.stats?.[legacy] ?? cur.stats?.[label[0]] ?? 0)]);
  }

  function wuchangEntries(cur){
    const wc = cur.wuchangOverride || cur.wuchang || {};
    return ['仁','义','礼','智','信'].map(k => [k, wc[k] ?? (k === '智' ? cur.intelligence : k === '仁' ? cur.benevolence : '')]);
  }

  function relationMeta(cur, other){
    const rel = cur.sourceRelations?.[other.name] || cur.sourceRelations?.[other.name?.replace('张嫣','张懿安')] || null;
    if(rel) return rel;
    const reverse = other.sourceRelations?.[cur.name] || null;
    if(reverse) return reverse;
    return null;
  }

  function relationScoreFromMeta(rel){
    if(!rel) return null;
    const affinity = Number(rel.affinity ?? 50);
    const trust = Number(rel.trust ?? affinity);
    const respect = Number(rel.respect ?? 50);
    const hostility = Number(rel.hostility ?? 0);
    const fear = Number(rel.fear ?? 0);
    return Math.max(0, Math.min(100, Math.round((affinity * 0.42) + (trust * 0.28) + (respect * 0.18) - (hostility * 0.28) - (fear * 0.08) + 18)));
  }

  function actionAvailability(cur){
    const isSelf = cur.id === 'player' || cur.playerRelation === '本人';
    const loc = String(cur.location || '');
    const inCapital = /京师|紫禁城|乾清宫|慈宁宫|司礼监|内廷|北京/.test(loc);
    const enRoute = !!(cur._travelTo || cur._enRouteToOffice || /途中|赴任/.test(cur.status || ''));
    if(isSelf) return {primary:'御案', note:'君主本人不可问对/传书，转入御案与官制。', inCapital:true, isSelf:true, enRoute:false};
    if(enRoute) return {primary:'途中', note:'人物正在赴任或行旅，暂不可召见，宜先记档。', inCapital:false, isSelf:false, enRoute:true};
    if(inCapital) return {primary:'问对', note:'人在京师，可御前召见；也可转入官制或奏疏关联。', inCapital:true, isSelf:false, enRoute:false};
    return {primary:'传书', note:'不在京师，旧 UI 位置闸门应转为鸿雁传书。', inCapital:false, isSelf:false, enRoute:false};
  }

  function politicalVerdict(cur){
    const loyalty = Number(cur.loyalty ?? 50);
    const ambition = Number(cur.ambition ?? 50);
    const stress = Number(resNumber(cur, 'stress', cur.stress));
    if(loyalty < 30 && ambition >= 70) return {label:'急险', text:'低忠高欲，须先控权柄，再议任使。'};
    if(stress >= 80) return {label:'将变', text:'压力逼近崩点，问对或事件很可能触发急变。'};
    if(loyalty >= 80 && ambition <= 45) return {label:'可托', text:'忠诚高而欲望低，可入稳定任事序列。'};
    if(ambition >= 70) return {label:'可用须制', text:'有能力也有自我目标，适合任事但需制衡。'};
    if(loyalty >= 60) return {label:'可近', text:'可召见、可任用，仍需观察党派与关系网。'};
    return {label:'观望', text:'政治态度未稳，宜先传书或从奏疏旁证。'};
  }

  function fieldPills(cur){
    const pills = [];
    if(cur.aiPersonaText) pills.push('AI 人格');
    if(cur.valueSystem) pills.push('价值系统');
    if(cur.behaviorMode) pills.push('行为模式');
    if(cur.secret) pills.push('隐秘字段');
    if(cur.historicalSources?.length) pills.push('史料来源');
    if(cur.personalGoals?.length) pills.push('多目标');
    if(cur.sourceRelations && Object.keys(cur.sourceRelations).length) pills.push('结构化关系');
    if(cur.resources?.publicPurse || cur.resources?.privateWealth) pills.push('公私资源');
    if(cur.familyMembers?.length) pills.push('家谱成员');
    return pills;
  }

  function personCurrent(){
    return persons.find(p => p.id === personState.selected) || persons[0];
  }

  function personSearchText(p){
    return [
      p.name, p.courtesy, p.zi, p.haoName, p.role, p.officialTitle, p.office, p.title, p.rank, p.party, p.faction, p.location, p.status,
      p.goal, p.personalGoal, p.bio, p.dualIdentity, p.birthplace, p.learning, p.stance, p.playerRelation, p.familyName,
      ...(p.traits || []), ...(p.traitIds || []), ...(p.flags || []), ...listify(p.hobbies),
      ...(p.career || []).map(careerLabel), ...(p.memories || []), ...(p._memory || []).map(memoryLabel), ...(p.stressSources || [])
    ].join(' ').toLowerCase();
  }

  function filteredPersons(){
    const q = String(personState.query || '').trim().toLowerCase();
    const group = personState.group || 'all';
    const role = personState.role || 'all';
    const showDead = personState.showDead === true || personState.showDead === '1';
    let list = persons.filter(p => {
      if(!showDead && p.alive === false) return false;
      if(group !== 'all' && p.faction !== group) return false;
      if(role !== 'all' && p.roleType !== role) return false;
      if(q && !personSearchText(p).includes(q)) return false;
      return true;
    });
    list = list.slice().sort((a,b) => {
      if(personState.sort === 'loyalty') return (b.loyalty || 0) - (a.loyalty || 0);
      if(personState.sort === 'stress') return (b.stress || 0) - (a.stress || 0);
      if(personState.sort === 'name') return a.name.localeCompare(b.name, 'zh-Hans-CN');
      return (b.importance || 0) - (a.importance || 0);
    });
    return list;
  }

  function renderOptions(options, current, firstLabel){
    const normalized = [['all', firstLabel], ...options.filter(([id]) => id !== 'all')];
    return normalized.map(([value, label]) => `<option value="${esc(value)}" ${String(current)===String(value)?'selected':''}>${esc(label)}</option>`).join('');
  }

  function relationScore(cur, other){
    const meta = relationMeta(cur, other);
    const score = relationScoreFromMeta(meta);
    if(Number.isFinite(score)) return score;
    if(cur.relations && Number.isFinite(cur.relations[other.id])) return cur.relations[other.id];
    if(other.relations && Number.isFinite(other.relations[cur.id])) return other.relations[cur.id];
    return cur.faction === other.faction ? 58 : 36;
  }

  function relationLabel(score){
    if(score >= 75) return '亲近';
    if(score >= 58) return '可协作';
    if(score >= 42) return '观望';
    if(score >= 25) return '互疑';
    return '敌对';
  }

  function showPersonOverlay(html){
    document.getElementById('renwu-atlas-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'renwu-atlas-overlay';
    overlay.className = 'tm-bridge-overlay show';
    overlay.innerHTML = html;
    overlay.addEventListener('click', ev => {
      if(ev.target === overlay || ev.target.closest('[data-close-bridge]')) closeRenwuAtlas();
    });
    document.body.appendChild(overlay);
    return overlay;
  }

  function renderPersonAtlas(){
    installPersonAtlasStyles();
    const cur = personCurrent();
    const list = filteredPersons();
    const groups = Array.from(new Set(persons.map(p => p.faction))).map(x => [x, x]);
    const visibleAlive = persons.filter(p => p.alive !== false).length;
    const warningCount = persons.filter(p => (p.stress || 0) >= 65 || (p.risks || []).length >= 2).length;
    const tabsHtml = tabs.map(([id,label]) => `<button class="${personState.tab===id?'active':''}" onclick="tmSetPersonTab('${id}')">${esc(label)}</button>`).join('');
    const listHtml = list.length ? list.map(p => {
      const dotClass = p.alive === false ? 'dead' : ((p.stress || 0) >= 65 ? 'warn' : '');
      const pOffice = p.officialTitle || p.office || p.title || '未授';
      return `<button class="tm-person-row ${p.id===cur.id?'active':''}" onclick="tmSelectPerson('${p.id}')">
        <img src="${esc(p.portrait)}" alt="">
        <span><b>${esc(p.name)}${p.courtesy ? ' · '+esc(p.courtesy) : ''}</b><span>${esc(pOffice)} · ${esc(p.party || p.faction)} · ${esc(p.location)}</span><span class="tm-person-row-meta"><i class="tm-person-status-dot ${dotClass}"></i>${esc(p.role)} / ${esc(rankLabel(p))}</span></span>
        <small>${esc(p.status)}</small>
      </button>`;
    }).join('') : `<div class="tm-person-card"><b>未检得人物</b><p>调宽党派、身份或姓名筛选后再试。</p></div>`;
    const curOffice = cur.officialTitle || cur.office || cur.title || '未授';
    const curZi = [cur.courtesy || cur.zi, cur.haoName ? '号'+cur.haoName : ''].filter(Boolean).join(' · ');

    return `<section class="tm-bridge-panel tm-person-rich-panel" role="dialog" aria-modal="true">
      <button class="tm-action-close tm-floating-close" data-close-bridge title="关闭">×</button>
      <div class="tm-person-rich">
        <aside class="tm-person-pane tm-person-left">
          <div class="tm-person-ledger-head"><span><span class="tm-person-title-line"><b>人物图志</b><button class="tm-person-ceming-top" onclick="tmOpenPersonCemingPage()" title="策名·将历史人物纳入人物志">策 名</button></span><span>名籍 / 关系 / 家谱</span></span><small>${esc(cur.location)}</small></div>
          <div class="tm-person-counts"><div><b>${persons.length}</b><span>总人物</span></div><div><b>${visibleAlive}</b><span>在世</span></div><div><b>${warningCount}</b><span>有风险</span></div></div>
          <div class="tm-person-search"><input class="tm-input" placeholder="检索姓名、官职、党派、地点、记忆" value="${esc(personState.query)}" oninput="tmSetPersonSearch(this.value)"></div>
          <div class="tm-person-filter-row">
            <select class="tm-person-select" onchange="tmSetPersonFilter('group',this.value)">${renderOptions(groups, personState.group, '全部党派')}</select>
            <select class="tm-person-select" onchange="tmSetPersonFilter('role',this.value)">${renderOptions(roleOptions, personState.role, '全部身份')}</select>
          </div>
          <div class="tm-person-filter-row">
            <select class="tm-person-select" onchange="tmSetPersonFilter('sort',this.value)">
              <option value="importance" ${personState.sort==='importance'?'selected':''}>按关键度</option>
              <option value="loyalty" ${personState.sort==='loyalty'?'selected':''}>按忠诚</option>
              <option value="stress" ${personState.sort==='stress'?'selected':''}>按压力</option>
              <option value="name" ${personState.sort==='name'?'selected':''}>按姓名</option>
            </select>
            <label class="tm-person-check"><input type="checkbox" ${personState.showDead?'checked':''} onchange="tmSetPersonFilter('showDead',this.checked?'1':'0')">含已故</label>
          </div>
          <div class="tm-person-list-shell"><div class="tm-person-list">${listHtml}</div></div>
        </aside>
        <main class="tm-person-pane tm-person-main">
          <header class="tm-person-head">
            <img class="tm-person-portrait" src="${esc(cur.portrait)}" alt="">
            <div class="tm-person-title">
              <h2>${esc(cur.name)}</h2>
              <p>${esc(curZi || '未录字号')} · ${esc(cur.role)} · ${esc(curOffice)} · ${esc(rankLabel(cur))}</p>
              <div class="tm-chip-row">${(cur.traits||[]).slice(0,5).map(t=>chip(t)).join('')}${chip(cur.party || cur.faction,'green')}${chip(cur.status)}</div>
              <p>${esc(cur.goal)}</p>
              <div class="tm-person-command-strip">
                <div><span>年龄</span><b>${esc(cur.age)} 岁</b></div>
                <div><span>所在地</span><b>${esc(cur.location)}</b></div>
                <div><span>门第党派</span><b>${esc(familyLabel(cur))}${cur.party ? ' · '+esc(cur.party) : ''}</b></div>
                <div><span>当前风险</span><b>${esc((cur.stressSources||cur.risks||[])[0] || '暂无')}</b></div>
              </div>
              <div class="tm-person-mini-tags">
                <span>籍贯 ${esc(cur.birthplace || '未录')}</span><span>学识 ${esc(cur.learning || '未录')}</span><span>立场 ${esc(cur.stance || '未录')}</span><span>关系 ${esc(cur.playerRelation || '未录')}</span>
              </div>
            </div>
          </header>
          <div class="tm-person-tabs">${tabsHtml}</div>
          <div class="tm-person-scroll">${renderPersonTab(cur)}</div>
        </main>
        <aside class="tm-person-pane tm-person-right">
          ${renderPersonRight(cur)}
        </aside>
      </div>
    </section>`;
  }

  function renderPersonRight(cur){
    const relations = persons.filter(p => p.id !== cur.id).sort((a,b)=>relationScore(cur,b)-relationScore(cur,a)).slice(0,5);
    const gate = actionAvailability(cur);
    const pub = purse(cur, 'publicPurse');
    const priv = purse(cur, 'privateWealth');
    const fame = resNumber(cur, 'fame', 0);
    const virtue = resNumber(cur, 'virtueMerit', 0);
    const primaryAction = gate.primary === '御案' ? '御案' : gate.primary === '传书' ? '传书' : '问对';
    const verdict = politicalVerdict(cur);
    const pills = fieldPills(cur);
    return `<div class="tm-person-card">
      <b>可用入口</b>
      <div class="tm-person-action-grid" style="margin-top:8px">
        <button class="tm-person-action-btn primary span" onclick="tmOpenPersonAction('${primaryAction}')">${esc(primaryAction)}</button>
        <button class="tm-person-action-btn" onclick="tmOpenPersonAction('传书')" ${gate.isSelf?'disabled':''}>传书</button>
        <button class="tm-person-action-btn" onclick="tmOpenPersonAction('官制')">官制任免</button>
        <button class="tm-person-action-btn" onclick="tmOpenPersonAction('奏疏')">关联奏疏</button>
        <button class="tm-person-action-btn" onclick="tmSetPersonTab('family')">家谱</button>
        <button class="tm-person-action-btn" onclick="tmOpenPersonAction('入史')">入史</button>
      </div>
      <div class="tm-person-right-note">${esc(gate.note)}</div>
    </div>
    <div class="tm-person-card"><b>朝堂风险</b>
      <div class="tm-person-verdict"><strong>${esc(verdict.label)}</strong><span>${esc(verdict.text)}</span></div>
      <div class="tm-person-risk-grid">
        <div><span>忠诚</span><b>${Math.round(cur.loyalty ?? 50)}</b></div>
        <div><span>野心</span><b>${Math.round(cur.ambition ?? 50)}</b></div>
        <div><span>压力</span><b>${Math.round(resNumber(cur,'stress',cur.stress))}</b></div>
        <div><span>健康</span><b>${Math.round(resNumber(cur,'health',cur.health))}</b></div>
        <div><span>名望</span><b>${fame > 0 ? '+'+fame : fame}</b></div>
        <div><span>贤能</span><b>${virtue > 0 ? '+'+virtue : virtue}</b></div>
      </div>
      <div class="tm-person-right-note">${esc(cur.behaviorMode || cur.valueSystem || cur.playerRelation || '暂无行为模式记录')}</div>
    </div>
    <div class="tm-person-card"><b>公私资源</b><div class="tm-res-grid" style="grid-template-columns:1fr;margin-top:8px">${resourceTriplet('公库/职权', pub)}${resourceTriplet('私产', priv)}</div></div>
    <div class="tm-person-card"><b>字段剖面</b>
      <div class="tm-person-field-pills">${pills.map(x=>`<span>${esc(x)}</span>`).join('') || '<span>基础字段</span>'}</div>
      <div class="tm-person-right-note">${esc(cur.valueSystem || cur.aiPersonaText || '正式接入后由 GM.chars 完整字段驱动。')}</div>
    </div>
    <div class="tm-person-card"><b>关系焦点</b><div class="tm-person-scrollbox">${relations.map(p=>{
      const score = relationScore(cur,p);
      const meta = relationMeta(cur,p);
      const label = meta?.labels?.length ? meta.labels.slice(0,2).join('、') : (cur.relationTags?.[p.id] || relationLabel(score));
      return `<div class="tm-person-rel-row"><b>${esc(p.name)}</b><span>${esc(label)}</span><i class="tm-person-rel-score"><i style="--v:${score}%"></i></i></div>`;
    }).join('')}</div></div>
    <div class="tm-person-card"><b>风险与记忆</b><div class="tm-person-note-list">${(cur.stressSources||cur.risks||[]).concat((cur._memory||[]).map(memoryLabel), cur.memories||[]).filter(Boolean).slice(0,7).map(x=>`<div class="tm-person-note">${esc(x)}</div>`).join('')}</div></div>
    <div class="tm-person-card"><b>史料/来源</b><div class="tm-person-source-list">${(cur.historicalSources||[]).slice(0,3).map(x=>`<div>${esc(x)}</div>`).join('') || '<div>此预览人物尚未嵌入史料原文；正式接入读取剧本 historicalSources。</div>'}</div></div>`;
  }

  function renderFamilyTreeSvg(cur){
    const groups = {'-2':[], '-1':[], '0':[], '1':[], '2':[]};
    (cur.familyMembers || []).forEach(member => {
      const g = String(member.generation ?? 0);
      if(groups[g]) groups[g].push(member);
    });
    groups['0'].unshift({
      name:cur.name,
      courtesy:cur.courtesy,
      relation:'本人',
      self:true,
      age:cur.age,
      title:cur.office || cur.rank
    });
    const labels = {'-2':'祖 辈','-1':'父 辈','0':'同 辈','1':'子 嗣','2':'孙 辈'};
    const yMap = {'-2':35, '-1':155, '0':275, '1':400, '2':525};
    let svg = '<svg viewBox="0 0 900 580" class="rwp-ft-svg">';
    svg += '<g class="ft-gen-labels" font-family="serif" font-size="11" letter-spacing="3" fill="#8a6d2b">';
    Object.keys(labels).forEach(g => {
      if(groups[g] && groups[g].length) svg += `<text x="14" y="${yMap[g]+25}">${labels[g]}</text>`;
    });
    svg += '<line x1="8" y1="35" x2="8" y2="555" stroke="#8a6d2b" stroke-width="1" opacity="0.4"/></g>';
    svg += '<g class="ft-nodes" font-family="serif">';
    Object.keys(groups).forEach(g => {
      const row = groups[g];
      if(!row.length) return;
      const gap = Math.min(120, (820 - 100) / Math.max(1,row.length));
      const rowWidth = (row.length - 1) * gap + 100;
      const startX = Math.max(60, 450 - rowWidth / 2);
      row.forEach((member, idx) => {
        const x = startX + idx * gap;
        const y = yMap[g];
        const dead = member.dead || member.deceased;
        const inLaw = member.inLaw || /妻|嫂|媳|姻|后|夫|母族|妻族|岳|丈/.test(member.relation || '');
        const cls = member.self ? 'self' : (dead ? 'dead' : (inLaw ? 'in-law' : ''));
        const rectFill = member.self ? 'rgba(184,154,83,0.12)' : (inLaw ? 'rgba(126,184,167,0.05)' : 'rgba(0,0,0,0.3)');
        const rectStroke = member.self ? '#d4be7a' : (inLaw ? '#7eb8a7' : '#b89a53');
        const rectStrokeW = member.self ? '2' : '1';
        const dashAttr = inLaw ? ' stroke-dasharray="3,2"' : '';
        const textColor = member.self ? '#d4be7a' : (dead ? '#9d917d' : (inLaw ? '#d4c9b0' : '#f8f3e8'));
        const relColor = member.self ? '#d4be7a' : (inLaw ? '#7eb8a7' : '#b89a53');
        const nodeHeight = member.self ? 50 : 40;
        const title = member.self
          ? `${member.courtesy ? '字'+member.courtesy+' · ' : ''}${member.age ? member.age+' · ' : ''}${member.title || ''}`
          : `${member.age ? member.age+' · ' : ''}${member.title || member.note || ''}`;
        svg += `<g class="ft-node ${cls}" transform="translate(${x},${y})">`;
        svg += `<rect width="100" height="${nodeHeight}" rx="4" fill="${rectFill}" stroke="${rectStroke}" stroke-width="${rectStrokeW}"${dashAttr}/>`;
        svg += `<text x="50" y="16" text-anchor="middle" font-size="9" fill="${relColor}" letter-spacing="2">${esc(member.relation || '亲属')}</text>`;
        svg += `<text x="50" y="${member.self?33:29}" text-anchor="middle" font-size="${member.self?15:13}" fill="${textColor}" ${member.self?'font-weight="bold"':''}>${esc((member.name||'')+(dead?' †':''))}</text>`;
        svg += `<text x="50" y="${member.self?44:38}" text-anchor="middle" font-size="${member.self?9:8}" fill="${member.self?'#b89a53':'#9d917d'}">${esc(title)}</text>`;
        svg += '</g>';
      });
    });
    svg += '</g></svg>';
    return svg;
  }

  function renderPersonFamily(cur){
    const tierMap = {imperial:'皇族', noble:'世家', gentry:'士族', common:'寒门'};
    const clanPrestige = Math.max(0, Math.min(100, Number(cur.clanPrestige ?? 50)));
    const members = cur.familyMembers || [];
    const inlaws = [];
    members.forEach(member => {
      const rel = member.relation || '';
      const isInLaw = member.inLaw === true || /妻|嫂|媳|姻|岳|丈|夫|后/.test(rel);
      if(isInLaw) inlaws.push(member);
    });
    if(cur.motherClan && cur.motherClan !== '未录') inlaws.push({name:cur.motherClan, family:cur.motherClan, relation:'母族'});
    if(cur.spouseClan && cur.spouseClan !== '未录' && cur.spouseClan !== '无') inlaws.push({name:cur.spouseClan, family:cur.spouseClan, relation:'妻族'});
    const courtRows = members.filter(member => member.title && !member.dead).slice(0,10);
    return `<section class="tm-person-section">
      <h3>家 谱 · 五 代 树 <small style="color:rgba(224,211,171,.48);font-size:11px;letter-spacing:.08em;">金框为本人 · 虚线为姻亲</small></h3>
      <div class="rwp-ft-svg-wrap">${renderFamilyTreeSvg(cur)}</div>
      <div class="rwp-ft-legend">
        <span class="rwp-ft-lg"><span class="rwp-ft-lg-mark self"></span>本 人</span>
        <span class="rwp-ft-lg"><span class="rwp-ft-lg-mark blood"></span>血 亲</span>
        <span class="rwp-ft-lg"><span class="rwp-ft-lg-mark inlaw"></span>姻 亲</span>
        <span class="rwp-ft-lg"><span class="rwp-ft-lg-mark dead"></span>已 故</span>
      </div>
    </section>
    <section class="tm-person-section">
      <h3>家 族 · 统 览</h3>
      <div class="rwp-ft-clan-grid">
        <div class="rwp-ft-clan-item"><div class="rwp-ft-clan-lb">族 望</div><div class="rwp-ft-clan-v-big">${Math.round(clanPrestige)}</div><div class="rwp-ft-clan-bar"><span class="rwp-ft-clan-bar-fill" style="width:${clanPrestige}%;"></span></div></div>
        <div class="rwp-ft-clan-item"><div class="rwp-ft-clan-lb">门 第</div><div class="rwp-ft-clan-v-big" style="color:#9fd4c5;">${esc(tierMap[cur.familyTier] || cur.familyTier || '—')}</div></div>
        <div class="rwp-ft-clan-item"><div class="rwp-ft-clan-lb">家 族 势 力</div><div class="rwp-ft-clan-v-big" style="font-size:16px;">${esc(cur.family?.clan || cur.faction || '—')}</div></div>
        <div class="rwp-ft-clan-item"><div class="rwp-ft-clan-lb">族 丁 总 数</div><div class="rwp-ft-clan-v-big">${members.length}</div></div>
      </div>
    </section>
    ${inlaws.length ? `<section class="tm-person-section"><h3>姻 亲 诸 族</h3><div class="tm-family-list">${inlaws.slice(0,8).map(member => `<div class="tm-family-list-row">· <b>${esc(member.family || member.name)}</b>（${esc(member.relation || '姻亲')}）${member.title ? `<span style="color:rgba(224,211,171,.48);margin-left:6px;">${esc(member.title)}</span>` : ''}</div>`).join('')}</div></section>` : ''}
    ${courtRows.length ? `<section class="tm-person-section"><h3>在 朝 者</h3><div class="tm-family-list">${courtRows.map(member => `<div class="tm-family-list-row">· <b>${esc(member.name)}</b>（${esc(member.title)}${member.relation ? ' · '+esc(member.relation) : ''}）</div>`).join('')}</div></section>` : ''}`;
  }

  function renderPersonTab(cur){
    if(personState.tab === 'dossier'){
      const zihao = [cur.courtesy || cur.zi, cur.haoName ? '号'+cur.haoName : ''].filter(Boolean).join(' / ');
      return `<div class="tm-person-section-grid">
        <section class="tm-person-section wide"><h3>身 份 档 案</h3>
          <div class="tm-person-grid three">
            ${personLine('姓名',cur.name)}${personLine('字/号',zihao)}${personLine('性别',cur.gender)}
            ${personLine('年龄',cur.age ? cur.age+' 岁' : '未详')}${personLine('身份',cur.role || cur.class)}${personLine('职业',cur.occupation || cur.officialTitle)}
            ${personLine('籍贯',cur.birthplace)}${personLine('所在地',cur.location)}${personLine('势力',cur.faction)}
            ${personLine('民族',cur.ethnicity)}${personLine('信仰',cur.faith)}${personLine('文化',cur.culture)}
            ${personLine('学识',cur.learning)}${personLine('辞令',cur.diction || cur.speechStyle)}${personLine('立场',cur.stance)}
            ${personLine('党派',cur.party ? cur.party+(cur.partyRank?' · '+cur.partyRank:'') : '未录')}${personLine('家族',familyLabel(cur))}${personLine('与君主',cur.playerRelation)}
          </div>
        </section>
        <section class="tm-person-section"><h3>公 职 身 份</h3>
          <div class="tm-person-grid">
            ${personLine('官职',cur.officialTitle || cur.title || cur.office)}${personLine('品秩',rankLabel(cur))}
            ${personLine('上司',cur.superior)}${personLine('职掌',cur.officeDuties || cur.vassalType)}
          </div>
        </section>
        <section class="tm-person-section"><h3>私 人 身 份</h3>
          <div class="tm-person-grid">
            ${personLine('父',cur.father || cur.family?.father)}${personLine('母',cur.mother || cur.family?.mother)}
            ${personLine('配偶',cur.spouse || cur.family?.spouse)}${personLine('师承',cur.mentor)}
            ${personLine('爱好',cur.hobbies)}${personLine('门第',familyLabel(cur))}
          </div>
        </section>
        <section class="tm-person-section wide"><h3>外 貌 与 生 平</h3><div class="tm-person-prose">${esc(cur.appearance || '外貌未录。')}</div><div class="tm-person-prose" style="margin-top:8px">${esc(cur.bio || '生平未录。')}</div></section>
      </div>`;
    }
    if(personState.tab === 'career'){
      const career = Array.isArray(cur.career) ? cur.career : [];
      return `<section class="tm-person-section"><h3>仕 途 履 历</h3>
        <div class="tm-person-timeline">${career.length ? career.map(item => {
          if(typeof item === 'string') return `<div class="tm-person-timeline-row"><span>—</span><div><b>${esc(item)}</b></div></div>`;
          return `<div class="tm-person-timeline-row"><span>${esc(item.year || item.date || '—')}</span><div><b>${esc(item.title || '履历')}</b><small>${esc(item.desc || item.note || (item.milestone ? '关键节点' : ''))}</small></div></div>`;
        }).join('') : '<div class="tm-person-note">暂无仕途节点。</div>'}</div>
      </section>
      <div class="tm-person-section-grid">
        <section class="tm-person-section"><h3>官 制 与 任 事</h3><div class="tm-person-grid">
          ${personLine('当前官职',cur.officialTitle || cur.title || cur.office)}${personLine('品级',rankLabel(cur))}
          ${personLine('任所',cur.location)}${personLine('上司',cur.superior)}
          ${personLine('可接系统','问对 / 鸿雁 / 官制 / 奏疏')}${personLine('位置闸门',actionAvailability(cur).note)}
        </div></section>
        <section class="tm-person-section"><h3>技 能 与 声 名</h3>
          <div class="tm-person-tags">${listify(cur.skills).concat(listify(cur.works)).map(x=>`<span class="tm-person-tag">${esc(x)}</span>`).join('') || '<span class="tm-person-tag">未录</span>'}</div>
          <div class="tm-person-grid" style="margin-top:8px">${personLine('名望',resNumber(cur,'fame',0))}${personLine('贤能',resNumber(cur,'virtueMerit',0))}${personLine('廉介',cur.integrity)}${personLine('行为',cur.behaviorMode)}</div>
        </section>
      </div>
      <section class="tm-person-section"><h3>个 人 志 向</h3>
        <div class="tm-person-prose">${esc(cur.personalGoal || cur.goal || '未录')}</div>
        <div class="tm-person-tags" style="margin-top:8px">${(cur.personalGoals || []).map(g => `<span class="tm-person-tag">${esc((g.shortTerm || g.longTerm || g.type || '').slice(0,42))}</span>`).join('')}</div>
      </section>`;
    }
    if(personState.tab === 'mind'){
      const mood = (cur._memory || []).slice(-1)[0]?.emotion || '平';
      return `<div class="tm-person-section-grid">
        <section class="tm-person-section"><h3>心 性 变量</h3>${personBar('忠诚',cur.loyalty)}${personBar('野心',cur.ambition)}${personBar('压力',resNumber(cur,'stress',cur.stress))}${personBar('健康',resNumber(cur,'health',cur.health))}${personBar('廉介',cur.integrity)}</section>
        <section class="tm-person-section"><h3>当 前 心 绪</h3><div class="tm-person-card"><b>〔${esc(mood)}〕${esc(cur.behaviorMode || '行为模式未录')}</b><p>${esc(cur.innerThought || '暂无内心独白。')}</p></div></section>
        <section class="tm-person-section wide"><h3>压力来源与舒解</h3><div class="tm-person-tags">${(cur.stressSources || []).map(x=>`<span class="tm-person-tag">${esc(x)}</span>`).join('') || '<span class="tm-person-tag">无明显压源</span>'}</div><div class="tm-person-prose" style="margin-top:8px">爱好/释压：${esc(cur.hobbies || '未录')}</div></section>
        <section class="tm-person-section"><h3>价值系统</h3><div class="tm-person-prose">${esc(cur.valueSystem || '未录')}</div></section>
        <section class="tm-person-section"><h3>深层隐线</h3><div class="tm-person-prose">${esc(cur.secret || '未录。正式游戏可按权限隐藏。')}</div></section>
      </div>`;
    }
    if(personState.tab === 'relations'){
      const sourceRows = Object.entries(cur.sourceRelations || {});
      const rows = sourceRows.length ? sourceRows.map(([name, rel]) => {
        const score = relationScoreFromMeta(rel) ?? 50;
        return `<div class="tm-person-rel-row"><b>${esc(name)}</b><span>${esc((rel.labels || []).join('、') || relationLabel(score))}</span><i class="tm-person-rel-score"><i style="--v:${score}%"></i></i></div>
          <div class="tm-person-grid" style="margin:0 0 7px 0">${personLine('亲近',rel.affinity)}${personLine('信任',rel.trust)}${personLine('敬重',rel.respect)}${personLine('敌意',rel.hostility)}</div>`;
      }).join('') : persons.filter(p=>p.id!==cur.id).map(p=>{
        const score = relationScore(cur,p);
        return `<div class="tm-person-rel-row"><b>${esc(p.name)} · ${esc(p.faction)}</b><span>${esc(cur.relationTags?.[p.id] || relationLabel(score))}</span><i class="tm-person-rel-score"><i style="--v:${score}%"></i></i></div>`;
      }).join('');
      return `<section class="tm-person-section"><h3>人 际 关 系 网</h3><div class="tm-person-scrollbox">${rows}</div></section>
      <div class="tm-person-section-grid">
        <section class="tm-person-section"><h3>血 缘 / 家 族</h3><div class="tm-person-scrollbox">${(cur.familyMembers||[]).map(m=>`<div class="tm-person-note"><b>${esc(m.name)}</b> · ${esc(m.relation || '亲属')} ${m.title ? ' · '+esc(m.title) : ''}</div>`).join('') || '<div class="tm-person-note">未录</div>'}</div></section>
        <section class="tm-person-section"><h3>印 象 摘 要</h3><div class="tm-person-scrollbox">${(cur.impressions||[]).slice(0,10).map(x=>`<div class="tm-person-note">${esc(x)}</div>`).join('') || '<div class="tm-person-note">未录</div>'}</div></section>
      </div>`;
    }
    if(personState.tab === 'memory'){
      const memories = (cur._memory && cur._memory.length) ? cur._memory.map(memoryLabel) : (cur.memories || []);
      return `<div class="tm-person-section-grid">
        <section class="tm-person-section"><h3>此 人 记 忆</h3><div class="tm-person-scrollbox">${memories.length ? memories.map(x=>`<div class="tm-person-note">${esc(x)}</div>`).join('') : '<div class="tm-person-note">暂无记忆。</div>'}</div></section>
        <section class="tm-person-section"><h3>史 料 与 档 案</h3><div class="tm-person-scrollbox">${(cur.historicalSources||[]).map(x=>`<div class="tm-person-note">${esc(x)}</div>`).join('') || '<div class="tm-person-note">预览暂无史料原文。</div>'}</div></section>
        <section class="tm-person-section wide"><h3>AI 人 格 提 示</h3><div class="tm-person-prose">${esc(cur.aiPersonaText || cur.valueSystem || cur.behaviorMode || '未录。')}</div><div class="tm-person-field-pills">${fieldPills(cur).map(x=>`<span>${esc(x)}</span>`).join('')}</div></section>
        <section class="tm-person-section wide"><h3>写 入 史 官 实 录</h3><div class="tm-person-grid">${personLine('来源','问对 / 奏疏 / 鸿雁 / 朝议')}${personLine('写入','史记、实录、纪事、编年')}${personLine('排序','按回合与事件时间')}${personLine('追踪','长期事势与人物记忆')}</div></section>
      </div>`;
    }
    if(personState.tab === 'family'){
      return renderPersonFamily(cur);
    }
    const pub = purse(cur, 'publicPurse');
    const priv = purse(cur, 'privateWealth');
    return `<div class="tm-person-section-grid">
      <section class="tm-person-section wide"><h3>人物总览</h3><div class="tm-person-grid three">${personLine('姓名',cur.name)}${personLine('官职',cur.officialTitle || cur.office || cur.title)}${personLine('品秩',rankLabel(cur))}${personLine('党派',cur.party || cur.faction)}${personLine('所在地',cur.location)}${personLine('当前目标',cur.goal)}</div></section>
      <section class="tm-person-section"><h3>公 私 资源</h3><div class="tm-res-grid">${resourceTriplet('公库/职权', pub)}${resourceTriplet('私产', priv)}</div><div class="tm-person-grid" style="margin-top:8px">${personLine('名望',resNumber(cur,'fame',0))}${personLine('贤能',resNumber(cur,'virtueMerit',0))}${personLine('健康',resNumber(cur,'health',cur.health))}${personLine('压力',resNumber(cur,'stress',cur.stress))}</div></section>
      <section class="tm-person-section"><h3>能力八才</h3><div class="tm-ability-matrix">${abilityEntries(cur).map(([label,val])=>`<div class="tm-ability-cell"><span>${esc(label)}<b>${Math.round(val)}</b></span><i style="--v:${Math.max(0,Math.min(100,val))}%"></i></div>`).join('')}</div></section>
      <section class="tm-person-section"><h3>五 常</h3><div class="tm-ability-matrix">${wuchangEntries(cur).map(([label,val])=>`<div class="tm-ability-cell"><span>${esc(label)}<b>${esc(val || '—')}</b></span><i style="--v:${Math.max(0,Math.min(100,Number(val)||0))}%"></i></div>`).join('')}</div></section>
      <section class="tm-person-section"><h3>性 格 特 质</h3><div class="tm-person-tags">${(cur.traits||cur.traitIds||[]).map(x=>`<span class="tm-person-tag">${esc(x)}</span>`).join('') || '<span class="tm-person-tag">未录</span>'}</div><div class="tm-person-prose" style="margin-top:8px">${esc(cur.aiPersonaText || cur.personality || '')}</div></section>
      <section class="tm-person-section wide"><h3>传 记</h3><div class="tm-person-prose">${esc(cur.bio || '暂无完整传记。')}</div></section>
      <section class="tm-person-section wide"><h3>旧人物志字段落位</h3><div class="tm-person-tags">${fieldCoverage.map(x=>`<span class="tm-person-tag">${esc(x)}</span>`).join('')}</div></section>
    </div>`;
  }

  function renderPersonCemingPage(){
    const dynastyOptions = ['全部朝代','明','宋','元','唐','清'];
    const typeOptions = ['全部类型','经世文臣','边务将才','清议名臣','自创人物'];
    return `<section class="tm-bridge-panel tm-person-ceming-panel" role="dialog" aria-modal="true">
      <button class="tm-action-close tm-floating-close" data-close-ceming title="关闭">×</button>
      <div class="tm-ceming-page">
        <header class="tm-ceming-head">
          <div><h2>敕召贤良</h2><p>策名 · 将历史人物、候选名录或自创人物纳入人物志</p></div>
          <span class="tm-ceming-mode">演义宽史模式</span>
        </header>
        <div class="tm-ceming-toolbar">
          <button class="active">档案库</button>
          <button onclick="toastPreview('预览：自寻贤臣会接入旧策名 AI 检索')">自寻贤臣</button>
          <select>${dynastyOptions.map(x=>`<option>${esc(x)}</option>`).join('')}</select>
          <select>${typeOptions.map(x=>`<option>${esc(x)}</option>`).join('')}</select>
          <button onclick="toastPreview('预览：已按时代、身份、重复名与生卒重新校验')">重新校验</button>
        </div>
        <div class="tm-ceming-body">
          <div class="tm-ceming-grid">
            ${candidates.map(c => `<article class="tm-ceming-card">
              <b>${esc(c.name)}</b>
              <p>${esc(c.type)} · ${esc(c.check)}</p>
              <p>${esc(c.route)}</p>
              <div class="tm-person-actions" style="margin-top:8px"><button class="primary" onclick="toastPreview('预览：${esc(c.name)} 奉诏来朝')">奉诏来朝</button><button onclick="toastPreview('预览：展开 ${esc(c.name)} 身份卡')">身份卡</button></div>
            </article>`).join('')}
          </div>
          <aside class="tm-ceming-aside">
            <h3>旧 UI 职能</h3>
            <div class="tm-person-note-list">
              <div class="tm-person-note">入口位于人物志标题工具区，不占用人物详情标签。</div>
              <div class="tm-person-note">档案库负责历史人物卡，正式接入时读取 tm-ceming 的 506 条档案。</div>
              <div class="tm-person-note">自寻贤臣负责 AI 检索与补全，校验年代、身份、重名、生卒与归属。</div>
              <div class="tm-person-note">写入后刷新 GM.chars / GM.allCharacters，并回到人物图志名籍。</div>
            </div>
          </aside>
        </div>
      </div>
    </section>`;
  }

  function openPersonCemingPage(){
    installPersonAtlasStyles();
    document.getElementById('person-ceming-overlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'person-ceming-overlay';
    overlay.className = 'tm-bridge-overlay show';
    overlay.innerHTML = renderPersonCemingPage();
    overlay.addEventListener('click', ev => {
      if(ev.target === overlay || ev.target.closest('[data-close-ceming]')) closePersonCemingPage();
    });
    document.body.appendChild(overlay);
  }

  function closePersonCemingPage(){
    document.getElementById('person-ceming-overlay')?.remove();
  }

  function openRenwuTuzhi(opts={}){
    if(opts.selected) personState.selected = opts.selected;
    if(opts.tab) {
      if(opts.tab === 'ceming') {
        showPersonOverlay(renderPersonAtlas());
        openPersonCemingPage();
        return;
      }
      personState.tab = opts.tab === 'identity' ? 'dossier' : opts.tab;
    }
    showPersonOverlay(renderPersonAtlas());
  }

  function closeRenwuAtlas(){
    document.getElementById('renwu-atlas-overlay')?.remove();
  }

  function tmSelectPerson(id){
    personState.selected = id;
    openRenwuTuzhi();
  }

  function tmSetPersonSearch(value){
    personState.query = value;
    clearTimeout(personState._timer);
    personState._timer = setTimeout(openRenwuTuzhi, 120);
  }

  function tmSetPersonTab(tab){
    personState.tab = tab === 'identity' ? 'dossier' : tab;
    openRenwuTuzhi();
  }

  function tmSetPersonFilter(key, value){
    if(key === 'showDead') personState.showDead = value === true || value === '1';
    else personState[key] = value;
    openRenwuTuzhi();
  }

  function tmOpenPersonAction(action){
    const cur = personCurrent();
    if(action === '御案' && typeof window.openYuanShiZheng === 'function'){
      window.openYuanShiZheng();
      return;
    }
    if(action === '御案' && typeof window.openYueAn === 'function'){
      window.openYueAn();
      return;
    }
    if(action === '问对' && typeof window.openPreviewWentian === 'function'){
      window.openPreviewWentian();
      toast(`预览：以 ${cur.name} 为问对对象。`);
      return;
    }
    if(action === '传书' && typeof window.openHongyan === 'function'){ window.openHongyan(); return; }
    if(action === '奏疏' && typeof window.openYueZou === 'function'){ window.openYueZou(); return; }
    if(action === '入史' && typeof window.openShilu === 'function'){ window.openShilu(); return; }
    if(action === '官制'){
      toast(`预览：${cur.name} 的官制任免将接入旧官制/任免树。`);
      return;
    }
    if(action === '策名' || action === '校验策名' || action === '写入策名'){
      openPersonCemingPage();
      toast(`预览：${action}会接入旧策名页面。`);
      return;
    }
    toast(`预览：${cur.name} · ${action} 将调用正式人物系统。`);
  }

  function bindPersonAtlasEntry(){
    const bind = ev => {
      ev.preventDefault();
      ev.stopPropagation();
      openRenwuTuzhi();
    };
    document.querySelectorAll('.renwu-tuzhi-entry,#renwu-tuzhi-hotspot').forEach(el => {
      if(el.dataset.personAtlasUpgradeBound) return;
      el.dataset.personAtlasUpgradeBound = '1';
      el.addEventListener('click', bind, true);
    });
  }

  Object.assign(window, {
    TM_PERSON_DATA: persons,
    openRenwuTuzhi,
    closeRenwuAtlas,
    tmSelectPerson,
    tmSetPersonSearch,
    tmSetPersonTab,
    tmSetPersonFilter,
    tmOpenPersonAction,
    tmOpenPersonCemingPage: openPersonCemingPage,
    tmClosePersonCemingPage: closePersonCemingPage
  });

  requestAnimationFrame(bindPersonAtlasEntry);
  document.addEventListener('keydown', ev => {
    if(ev.key === 'Escape' && document.getElementById('person-ceming-overlay')) closePersonCemingPage();
  });
})();
