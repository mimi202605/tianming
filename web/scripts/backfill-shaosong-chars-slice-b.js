#!/usr/bin/env node
// scripts/backfill-shaosong-chars-slice-b.js
// 2026-05-21·Slice B·绍宋 characters 73 → 98 (+25 关键历史人物)
//
// 选人原则·建炎元年八月这一刻在世且有政治分量·
//   1. 太学事件三人  陈东 欧阳澈 范如圭
//   2. 伪楚残余       张邦昌 王时雍 莫俦
//   3. 河南义军       翟兴 翟进 翟琮
//   4. 太行八字军     何元庆 邵兴
//   5. 河北义军       杨进 刘文舜
//   6. 西军 / 北方武将 折彦质 韩肖胄 郭浩 杨政
//   7. 御营骨干       王德 田师中
//   8. 文人 / 学派    胡安国 杨时 陈与义 李宝 (青年)
//   9. 金军大将       完颜宗辅 完颜银术可 完颜杲

'use strict';

const fs = require('fs');
const path = require('path');

const SCENARIO_PATH = path.resolve(__dirname, '..', '..', 'scenarios', '绍宋·建炎元年八月（官方）.json');
const SID = 'sc-shaosong-1127';

function stamp() {
  const d = new Date();
  return d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0') + '-' +
    String(d.getUTCHours()).padStart(2, '0') +
    String(d.getUTCMinutes()).padStart(2, '0') +
    String(d.getUTCSeconds()).padStart(2, '0');
}
function rid(prefix) { return prefix + '_' + Math.random().toString(36).slice(2, 12); }

function ch(name, opts) {
  return Object.assign({
    id: rid('char'),
    sid: SID,
    name,
    alive: true,
    isHistorical: true,
    gender: 'male',
    ethnicity: '汉',
    faith: '儒释道',
    culture: '宋',
    class: '士',
    presenceState: 'present',
    active: true,
    loyalty: 50,
    integrity: 50,
    ambition: 50,
    intelligence: 50,
    administration: 50,
    military: 50,
    diplomacy: 50,
    benevolence: 50,
    learning: 50,
    valor: 50,
    charisma: 50,
    management: 50,
    diction: 50,
    age: 40,
    rankLevel: 5,
    party: '',
    partyRank: '',
    role: '官',
    title: '',
    officialTitle: '',
    location: '',
    birthYear: 1087,
    birthplace: '',
    occupation: '官',
    bio: '',
    aiPersonaText: '',
    personality: '',
    innerThought: '',
    appearance: '',
    personalGoal: '',
    stance: '',
    historicalSources: [],
    traits: [],
    family: '',
    familyMembers: [],
    familyTier: 3,
    familyRole: '',
    stressSources: [],
    clanPrestige: 30,
    type: 'character',
    isPlayer: false,
    isRoyal: false,
    playerRelation: 0,
    resources: {}
  }, opts);
}

const NEW_CHARS = [
  // ── 太学事件三人 (1127.08·陈东欧阳澈被斩为剧本背景关键事件) ──
  ch('陈东', {
    faction: '宋朝廷', party: '主战', role: '太学生',
    age: 41, birthYear: 1086, birthplace: '镇江府丹阳',
    intelligence: 80, integrity: 95, ambition: 65, military: 30, administration: 55,
    diplomacy: 60, benevolence: 80, learning: 85, valor: 75, charisma: 85,
    loyalty: 90, rankLevel: 9, occupation: '太学生',
    title: '太学领袖',
    bio: '太学领袖·靖康初年屡上书力斥蔡京六贼·挽留李纲·开北宋末年太学生议政之风。建炎元年八月与欧阳澈联名上书力陈主战·斥黄潜善 / 汪伯彦·赵构怒·与欧阳澈同被斩于应天府·开南宋初年杀谏臣之恶例。',
    aiPersonaText: '激进慷慨·言行不顾后果·士大夫风骨之极致·愿以一死殉国论。',
    personality: '刚直·激切·不避祸',
    stance: '主战·清议·反主和派',
    traits: ['scholar-activist', 'martyr', 'pure-faction'],
    personalGoal: '上书警醒帝王·清扫主和奸臣·迎回二圣'
  }),
  ch('欧阳澈', {
    faction: '宋朝廷', party: '主战', role: '士子',
    age: 30, birthYear: 1097, birthplace: '抚州崇仁',
    intelligence: 70, integrity: 92, ambition: 50, military: 25, administration: 40,
    diplomacy: 50, benevolence: 75, learning: 75, valor: 70, charisma: 70,
    loyalty: 90, rankLevel: 9, occupation: '布衣士子',
    title: '布衣',
    bio: '抚州崇仁布衣·建炎元年八月与陈东上书力斥黄汪·力主迎回二圣 / 留李纲。同日同被斩。年仅三十。后人 (绍兴年间) 追赠秘阁修撰·与陈东并列南宋初年清议第一人。',
    aiPersonaText: '清直善文·胸怀国忧·与陈东相和而行。',
    personality: '清介·激切',
    stance: '主战·清议',
    traits: ['scholar-activist', 'martyr']
  }),
  ch('范如圭', {
    faction: '宋朝廷', party: '主战', role: '官',
    age: 26, birthYear: 1101, birthplace: '建州建阳',
    intelligence: 75, integrity: 80, ambition: 60, military: 30, administration: 65,
    learning: 80, valor: 55, loyalty: 70, rankLevel: 7,
    officialTitle: '太学生 / 秘书省正字',
    title: '太学谏官',
    bio: '建州建阳人·宣和六年进士。少年清议·建炎元年八月上书救李纲·言"陛下不可弃宗社而南渡"。后绍兴年间历任地方·屡有清誉。',
    aiPersonaText: '少年清直·愿继陈东欧阳澈风骨。',
    personality: '清介有义气',
    stance: '主战',
    traits: ['young-radical', 'scholar']
  }),

  // ── 伪楚残余 (1127.03 立·04 即让位·此时已废) ──
  ch('张邦昌', {
    faction: '宋朝廷', party: '主和', role: '官·废楚',
    age: 47, birthYear: 1081, birthplace: '永静军东光',
    intelligence: 70, integrity: 25, ambition: 65, military: 30, administration: 75,
    learning: 65, charisma: 60, loyalty: 30, rankLevel: 2,
    officialTitle: '观文殿大学士·太保 (废楚帝改授)',
    title: '废楚帝',
    bio: '北宋宰相·靖康之难为金人立为伪楚帝 (1127.03)·赵构即位 (1127.05) 后让位归宋·封同安郡王·后太保观文殿大学士。建炎元年八月在朝中仍居高位·然主和议·朝野斥为奸。次年 (1128) 因事被赐死。',
    aiPersonaText: '怕事·欲偏安·以让位求保身·实质主和。',
    personality: '怯懦·趋附',
    stance: '主和·偏安',
    traits: ['ex-puppet', 'collaborator-suspect', 'former-prime-minister'],
    presenceState: 'present'
  }),
  ch('王时雍', {
    faction: '宋朝廷', party: '主和', role: '官·伪楚故人',
    age: 50, birthYear: 1078,
    intelligence: 65, integrity: 30, ambition: 60, administration: 70,
    loyalty: 35, rankLevel: 3,
    officialTitle: '吏部尚书 (伪楚) → 罢',
    title: '伪楚故相',
    bio: '伪楚朝相·张邦昌让位后被废居。建炎元年八月在朝中尚有党羽·依附黄潜善 / 汪伯彦。',
    aiPersonaText: '阴鸷善谋·依附主和派·欲恢复昔日权位。',
    stance: '主和·投机',
    traits: ['ex-puppet-minister', 'opportunist']
  }),

  // ── 河南义军 翟氏三人 ──
  ch('翟兴', {
    faction: '太行八字军', party: '主战', role: '义军帅',
    age: 51, birthYear: 1077, birthplace: '河南伊阳',
    intelligence: 65, integrity: 80, ambition: 50, military: 80, administration: 60,
    valor: 85, loyalty: 90, rankLevel: 6,
    officialTitle: '京西北路安抚制置使',
    title: '河南义军帅',
    bio: '河南伊阳人·伊洛义军帅。靖康年间起兵抗金·守河南诸州·依宋朝廷。建炎元年八月仍守伊阳·与弟翟进互为犄角。后绍兴年间为部下所杀。',
    aiPersonaText: '勇毅守土·与弟翟进同心·宁死不附金。',
    stance: '主战',
    traits: ['militia-leader', 'frontier-defender'],
    family: '翟氏', familyMembers: ['翟进', '翟琮']
  }),
  ch('翟进', {
    faction: '太行八字军', party: '主战', role: '义军将',
    age: 48, birthYear: 1080, birthplace: '河南伊阳',
    intelligence: 60, integrity: 75, ambition: 45, military: 75, valor: 80,
    loyalty: 92, rankLevel: 7,
    officialTitle: '京西路兵马都监',
    bio: '翟兴弟·与兄共守河南。骁勇善战·建炎二年战死。',
    aiPersonaText: '直勇善战·与兄同心。',
    stance: '主战',
    traits: ['militia-leader', 'warrior'],
    family: '翟氏', familyMembers: ['翟兴', '翟琮']
  }),
  ch('翟琮', {
    faction: '太行八字军', party: '主战', role: '义军继任',
    age: 26, birthYear: 1101,
    intelligence: 55, military: 70, valor: 75, loyalty: 90, integrity: 70,
    rankLevel: 8, officialTitle: '河南义军次将',
    bio: '翟兴子·伊阳人·随父叔抗金。后承父业·绍兴年间继任义军帅。',
    aiPersonaText: '少年继业·孝勇兼具。',
    stance: '主战',
    traits: ['militia-young'],
    family: '翟氏', familyMembers: ['翟兴', '翟进']
  }),

  // ── 太行八字军部将 ──
  ch('何元庆', {
    faction: '太行八字军', party: '主战', role: '义军将',
    age: 38, birthYear: 1090,
    intelligence: 50, military: 78, valor: 88, loyalty: 90, integrity: 70,
    rankLevel: 7, officialTitle: '太行八字军统制',
    bio: '太行义军大将·王彦部曲。八字军 (面刺"赤心报国誓杀金贼") 主力·守太行抗金。',
    aiPersonaText: '勇悍敢死·誓死抗金。',
    stance: '主战',
    traits: ['militia-warrior', 'eight-char-army']
  }),
  ch('邵兴', {
    faction: '太行八字军', party: '主战', role: '义军将·河东',
    age: 32, birthYear: 1095,
    intelligence: 60, military: 70, valor: 80, loyalty: 88, integrity: 75,
    rankLevel: 7, officialTitle: '河东义军统制',
    bio: '河东解州人·与弟邵翼起兵抗金·守解州。后归宋·绍兴中卒。',
    aiPersonaText: '骁悍义气·守乡土。',
    stance: '主战',
    traits: ['militia-warrior', 'hedong']
  }),

  // ── 河北义军 ──
  ch('杨进', {
    faction: '河北义军', party: '主战', role: '义军帅',
    age: 35, birthYear: 1092,
    intelligence: 50, military: 72, valor: 82, loyalty: 75, integrity: 60,
    rankLevel: 8, officialTitle: '河北义军号"没角牛"',
    bio: '河北义军首领·绰号"没角牛"·王善部副。靖康后聚众数万抗金 / 自保。建炎中渐归朝廷·后为乱兵所杀。',
    aiPersonaText: '草莽英雄·亦战亦盗·有归附心。',
    stance: '主战 / 自重',
    traits: ['militia-bandit', 'hebei']
  }),
  ch('刘文舜', {
    faction: '太行八字军', party: '主战', role: '义军将·太行',
    age: 40, birthYear: 1087,
    intelligence: 55, military: 65, valor: 75, loyalty: 80, integrity: 65,
    rankLevel: 8, officialTitle: '太行义军部将',
    bio: '太行山义军大将·王彦部·与何元庆等共守太行。',
    aiPersonaText: '刚毅守山·誓不降金。',
    stance: '主战',
    traits: ['militia-warrior', 'taihang']
  }),

  // ── 西军 / 北方武将 ──
  ch('折彦质', {
    faction: '宋朝廷', party: '务实', role: '老将',
    age: 50, birthYear: 1078, birthplace: '府州 (今陕西府谷)',
    intelligence: 70, military: 75, valor: 75, loyalty: 80, integrity: 70,
    administration: 65, rankLevel: 3, officialTitle: '签书枢密院事',
    title: '折家将后裔',
    bio: '府州 (今陕西府谷) 人·折家将世系。北宋老将·守河中失利后入朝任枢密。建炎元年八月签书枢密院事·主战派同情者·然较务实。',
    aiPersonaText: '老成持重·虑事周详·非莽进。',
    stance: '务实·偏主战',
    traits: ['veteran', 'border-clan', 'zhe-family'],
    family: '折氏'
  }),
  ch('韩肖胄', {
    faction: '宋朝廷', party: '务实', role: '官',
    age: 53, birthYear: 1075, birthplace: '相州安阳',
    intelligence: 75, integrity: 80, administration: 75, diplomacy: 80,
    loyalty: 80, rankLevel: 3, officialTitle: '枢密都承旨',
    bio: '相州安阳人·韩琦曾孙。建炎元年八月任枢密都承旨。后任出使金国正使·谈判迎二宗·南宋初年重要外交官。',
    aiPersonaText: '世家子·重稳·善外交。',
    stance: '务实',
    traits: ['descendant-of-han-qi', 'diplomat']
  }),
  ch('郭浩', {
    faction: '西军（关陕）', party: '武将', role: '将',
    age: 40, birthYear: 1088, birthplace: '德顺军隆德',
    intelligence: 60, military: 80, valor: 80, loyalty: 75, integrity: 65,
    rankLevel: 5, officialTitle: '泾原路统制',
    bio: '德顺军隆德人·西军大将·与吴玠 / 杨政共守关陕。骁勇善战·绍兴中迁益昌都统制。',
    aiPersonaText: '骁勇善战·与吴玠相得。',
    stance: '武将·西军',
    traits: ['frontier-general']
  }),
  ch('杨政', {
    faction: '西军（关陕）', party: '武将', role: '将',
    age: 30, birthYear: 1098, birthplace: '原州临泾',
    intelligence: 55, military: 78, valor: 82, loyalty: 80, integrity: 60,
    rankLevel: 5, officialTitle: '熙河路统制',
    bio: '原州临泾人·西军将·吴玠部曲。少年勇·后绍兴中节度使。',
    aiPersonaText: '少年勇悍·有冲阵之姿。',
    stance: '武将·西军',
    traits: ['young-general']
  }),

  // ── 御营骨干 ──
  ch('王德', {
    faction: '宋朝廷', party: '武将', role: '将',
    age: 41, birthYear: 1087, birthplace: '通远军熟羌',
    intelligence: 55, military: 72, valor: 80, loyalty: 80,
    rankLevel: 6, officialTitle: '御营前军统制',
    bio: '通远军 (今甘肃陇西) 人·号"王夜叉"·御营前军大将·张俊部。骁勇善战·后绍兴中御前军节度。',
    aiPersonaText: '夜叉之名·入阵敢死。',
    stance: '武将·御营',
    traits: ['warrior', 'frontline']
  }),
  ch('田师中', {
    faction: '宋朝廷', party: '武将', role: '将',
    age: 35, birthYear: 1093, birthplace: '泸州',
    intelligence: 55, military: 68, valor: 72, loyalty: 78,
    rankLevel: 7, officialTitle: '御营中军统制',
    bio: '御营中军将·岳飞部之邻。绍兴中累功至节度使。',
    aiPersonaText: '步骑骁悍·循令而战。',
    stance: '武将·御营',
    traits: ['warrior']
  }),

  // ── 文人·学派 ──
  ch('胡安国', {
    faction: '宋朝廷', party: '务实', role: '学者·官',
    age: 53, birthYear: 1074, birthplace: '建州崇安',
    intelligence: 85, integrity: 88, learning: 95, ambition: 50, administration: 60,
    diplomacy: 55, benevolence: 80, loyalty: 78, rankLevel: 4,
    officialTitle: '中书舍人·崇政殿说书',
    title: '春秋学大家',
    bio: '建州崇安人·绍圣进士。北宋程朱学派后承·主春秋大义。主战派理论支柱·建炎元年八月在朝中议政·后绍兴年间隐居衡山著《春秋传》。',
    aiPersonaText: '春秋大义·华夷之辨·主战理论基。',
    personality: '清介寡言·学问精深',
    stance: '务实·偏主战 (理论)',
    traits: ['confucian-master', 'spring-autumn-school'],
    family: '胡氏', familyMembers: ['胡寅']
  }),
  ch('杨时', {
    faction: '宋朝廷', party: '主战', role: '宿儒',
    age: 75, birthYear: 1053, birthplace: '南剑州将乐',
    intelligence: 88, integrity: 95, learning: 98, ambition: 30, administration: 50,
    benevolence: 90, loyalty: 80, rankLevel: 3,
    officialTitle: '工部侍郎·龙图阁直学士 (致仕)',
    title: '二程门人·南渡文宗',
    bio: '南剑州将乐人·二程门人 ("程门立雪")·南渡文宗·主战派精神导师。靖康年间力斥蔡京六贼·主李纲北伐。建炎元年已七十五·形体衰弱然清议犹高。',
    aiPersonaText: '理学宗师·年高德劭·言出士林必从。',
    personality: '清介澹泊·言简意赅',
    stance: '主战 / 清议',
    traits: ['neo-confucian-master', 'cheng-school', 'venerated-elder'],
    family: '杨氏'
  }),
  ch('陈与义', {
    faction: '宋朝廷', party: '主战', role: '官·诗人',
    age: 37, birthYear: 1090, birthplace: '河南洛阳',
    intelligence: 75, integrity: 70, learning: 85, charisma: 75, diction: 90,
    administration: 60, loyalty: 75, rankLevel: 5,
    officialTitle: '兵部员外郎',
    title: '南渡诗宗',
    bio: '河南洛阳人·宣和六年进士。靖康乱后南渡·诗追陶谢·感时伤事·开南宋豪放词派之先。建炎元年八月在朝中·后绍兴年间累至参知政事。',
    aiPersonaText: '清雅悲慨·诗人之襟·亦能议政。',
    personality: '清雅深沉',
    stance: '主战 / 文人',
    traits: ['poet-laureate', 'literati']
  }),
  ch('李宝', {
    faction: '宋朝廷', party: '武将', role: '将',
    age: 30, birthYear: 1097, birthplace: '乘氏 (今山东菏泽)',
    intelligence: 65, military: 72, valor: 80, loyalty: 85, integrity: 70,
    rankLevel: 7, officialTitle: '京东路忠义军统制',
    bio: '乘氏 (今山东) 人·靖康间率忠义军抗金。建炎元年八月领京东忠义军·后绍兴中为南宋水军大将·绍兴卅一年陈家岛海战大破金水师。',
    aiPersonaText: '忠义敢死·北人南来·渐近水军。',
    stance: '武将·忠义军',
    traits: ['young-general', 'future-naval-hero']
  }),

  // ── 金军大将 ──
  ch('完颜宗辅', {
    faction: '金国（大金）', party: '金军', role: '将·宗室',
    age: 31, birthYear: 1096, ethnicity: '女真',
    intelligence: 65, military: 78, valor: 82, loyalty: 90, ambition: 60,
    rankLevel: 2, officialTitle: '都元帅府右副元帅',
    title: '金太祖第三子',
    bio: '金太祖完颜阿骨打第三子·宗望弟·宗弼兄。骁勇善战·靖康间随宗望破汴梁。建炎元年八月任右副元帅·与宗翰共谋南下。',
    aiPersonaText: '太祖之子·骁勇任侠。',
    stance: '金军主力',
    traits: ['jin-royal', 'general', 'aguda-son'],
    isRoyal: true, faith: '萨满 / 佛教'
  }),
  ch('完颜银术可', {
    faction: '金国（大金）', party: '金军', role: '将',
    age: 55, birthYear: 1073, ethnicity: '女真',
    intelligence: 60, military: 75, valor: 78, loyalty: 88,
    rankLevel: 3, officialTitle: '西路军都统',
    bio: '金完颜部将·西路军老将·随宗翰征宋。骁勇善战·建炎中常驻陕西方面·与西军吴玠多次交锋。',
    aiPersonaText: '老将·稳重善守。',
    stance: '金军西路',
    traits: ['jin-veteran', 'general'],
    faith: '萨满'
  }),
  ch('完颜杲', {
    faction: '金国（大金）', party: '金军', role: '将·宗室·摄政',
    age: 45, birthYear: 1082, ethnicity: '女真',
    intelligence: 75, integrity: 60, ambition: 70, military: 70, administration: 75,
    rankLevel: 1, officialTitle: '谙班勃极烈 (储君之位)',
    title: '完颜斜也·完颜阿骨打之弟',
    bio: '金太祖完颜阿骨打弟·名斜也·杲是字。金朝初期重臣·任谙班勃极烈 (储君之位)·掌大政。建炎元年八月主政金廷·参与对宋战略制定。次年 (1128) 卒。',
    aiPersonaText: '宗室元老·政事谙练·南征大计在握。',
    stance: '金廷元老',
    traits: ['jin-royal', 'regent', 'elder'],
    isRoyal: true, faith: '萨满'
  })
];

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const sc = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8'));
  const existing = sc.characters || [];
  const existingNames = new Set(existing.map(c => c.name));

  const toAdd = NEW_CHARS.filter(c => !existingNames.has(c.name));
  const skipped = NEW_CHARS.filter(c => existingNames.has(c.name));

  console.log('===== 绍宋 Slice B chars =====');
  console.log('existing chars:', existing.length);
  console.log('candidate new:', NEW_CHARS.length);
  console.log('  to add:', toAdd.length);
  console.log('  skipped (already in):', skipped.length, skipped.length ? '(' + skipped.map(c=>c.name).join(',') + ')' : '');
  console.log();
  // 按 faction 分组报告
  const byFac = {};
  toAdd.forEach(c => {
    const f = c.faction || '(?)';
    if (!byFac[f]) byFac[f] = [];
    byFac[f].push(c.name);
  });
  console.log('by faction:');
  Object.keys(byFac).forEach(f => {
    console.log('  +', f, '·', byFac[f].length, '人·', byFac[f].join('·'));
  });

  if (dryRun) {
    console.log('\n--dry-run·未写。');
    return;
  }

  // 备份
  const bakDir = path.join(path.dirname(SCENARIO_PATH), '_archived-backups');
  fs.mkdirSync(bakDir, { recursive: true });
  const bakPath = path.join(bakDir, path.basename(SCENARIO_PATH) + '.pre-shaosong-chars-slice-b-' + stamp() + '.bak');
  if (!fs.existsSync(bakPath)) fs.copyFileSync(SCENARIO_PATH, bakPath);
  console.log('\n备份·' + bakPath);

  sc.characters = existing.concat(toAdd);
  fs.writeFileSync(SCENARIO_PATH, JSON.stringify(sc, null, 2) + '\n', 'utf8');
  console.log('写入·' + existing.length + ' → ' + sc.characters.length);
}

main();
