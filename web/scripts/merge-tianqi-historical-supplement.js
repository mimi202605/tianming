#!/usr/bin/env node
/* eslint-env node */

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..', '..');
const webRoot = path.resolve(__dirname, '..');
const scenarioDir = path.join(repoRoot, 'scenarios');
const scenarioFile = fs.readdirSync(scenarioDir).find(name => /天启七年/.test(name) && /官方/.test(name) && name.endsWith('.json'));
if (!scenarioFile) throw new Error('未找到天启七年官方剧本');

const scenarioPath = path.join(scenarioDir, scenarioFile);
const supplementPath = path.join(webRoot, 'data', 'scenario-supplements', 'tianqi7-ming2-historical-supplement.json');
const generatedAdminPath = path.join(webRoot, 'data', 'maps', 'tianqi-ming2', 'tianqi-ming2.admin-hierarchy.json');
const auditOut = path.join(webRoot, 'data', 'maps', 'tianqi-ming2', 'tianqi-official-merge-audit.json');

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function writeJson(file, value) {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
}

function stamp() {
  const d = new Date();
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

function uniq(values) {
  return [...new Set((values || []).filter(Boolean))];
}

const portraitDir = path.join(webRoot, 'assets', 'portraits', 'tianqi7');
const portraitBase = 'assets/portraits/tianqi7/';
const genericPortraitBase = `${portraitBase}generic/`;

function listSpecificPortraits() {
  if (!fs.existsSync(portraitDir)) return new Map();
  const files = fs.readdirSync(portraitDir)
    .filter(name => name.endsWith('.png'))
    .filter(name => fs.statSync(path.join(portraitDir, name)).isFile());
  return new Map(files.map(file => [file.replace(/\.png$/i, ''), `${portraitBase}${file}`]));
}

function portraitText(character) {
  return [
    character?.name, character?.faction, character?.factionId, character?.party,
    character?.title, character?.officialTitle, character?.role, character?.class,
    character?.occupation, character?.gender, character?.family, character?.ethnicity,
  ].filter(Boolean).join(' ');
}

function portraitHash(text) {
  let hash = 0;
  for (const ch of String(text || '')) hash = ((hash * 31) + ch.charCodeAt(0)) >>> 0;
  return hash;
}

function portraitPick(character, one, two = one) {
  return `${genericPortraitBase}${portraitHash(character?.name) % 2 ? two : one}`;
}

function genericTianqiPortrait(character) {
  const text = portraitText(character);
  if (/皇后|太后|贵妃|妃|选侍|宫人|女|夫人|春日局|海兰珠|布木布泰|哲哲|苏泰|囊囊|田川/.test(text)) return portraitPick(character, 'generic-court-woman-01.png', 'generic-court-woman-02.png');
  if (/后金|女真|满洲|八旗|建州|爱新觉罗|佟养性|李永芳|宁完我|鲍承先|豪格|济尔哈朗|阿济格|多铎|皇太极|代善|多尔衮|莽古尔泰|阿敏/.test(text)) return portraitPick(character, 'generic-later-jin-manchu-mongol-01.png', 'generic-later-jin-manchu-mongol-02.png');
  if (/蒙古|察哈尔|科尔沁|土默特|哈喇|台吉|汗|林丹|奥巴|寨桑|额哲/.test(text)) return portraitPick(character, 'generic-steppe-khan-noble-01.png', 'generic-steppe-khan-noble-02.png');
  if (/朝鲜|李倧|昭显|金瑬|金尚宪|崔鸣吉|林庆业/.test(text)) return portraitPick(character, 'generic-joseon-court-01.png', 'generic-joseon-court-02.png');
  if (/日本|德川|松前|幕府|春日局|田川|虾夷|阿伊努/.test(text)) return portraitPick(character, 'generic-japan-ainu-01.png');
  if (/葡萄牙|西班牙|荷兰|东印度|欧洲|罗保|马士加路也|罗儒望|阳玛诺|曾德昭|包加禄|德威特|纳茨|普特曼斯|尼尼奥|阿杜亚特/.test(text)) return portraitPick(character, 'generic-european-contact-01.png');
  if (/郑氏|海商|福建水师|郑芝龙|郑芝虎|郑鸿逵|郑芝豹|李魁奇|许心素|田川/.test(text)) return portraitPick(character, 'generic-maritime-zheng-01.png', 'generic-maritime-zheng-02.png');
  if (/流寇|饥民|起义|叛|土司|播州|奢安|王嘉胤|高迎祥|李自成|张献忠|罗汝才|马守应|贺一龙|贺锦|刘宗敏|奢崇明|安邦彦/.test(text)) return portraitPick(character, 'generic-rebel-tusi-bandit-01.png', 'generic-rebel-tusi-bandit-02.png');
  if (/太监|宦|司礼监|内臣|魏忠贤|王体乾|涂文辅|李永贞|王承恩|曹化淳|方正化/.test(text)) return portraitPick(character, 'generic-ming-eunuch-01.png', 'generic-ming-eunuch-02.png');
  if (/阉党|魏党|崔呈秀|田尔耕|许显纯|黄立极|施凤来|冯铨|周应秋|潘汝桢|张瑞图|薛贞|薛凤翔|李养正|杨所修|毛一鹭/.test(text)) return portraitPick(character, 'generic-ming-yandang-official-01.png', 'generic-ming-yandang-official-02.png');
  if (/总兵|参将|游击|都督|将军|经略|督师|巡抚|辽东|蓟辽|关宁|山海|边军|水师|袁崇焕|孙承宗|毛文龙|满桂|赵率教|祖大寿|洪承畴|卢象升|孙传庭|秦良玉|吴三桂|侯世禄|杜文焕|渠家祯|朱燮元|杨嗣昌|熊文灿/.test(text)) return portraitPick(character, 'generic-ming-general-01.png', 'generic-ming-general-02.png');
  if (/翰林|讲官|学士|进士|书院|东林|复社|儒|徐光启|韩爌|钱龙锡|成基命|刘鸿训|李标|毕自严|温体仁|周延儒|孙元化|顾炎武|黄宗羲|王夫之|张溥|陈子龙|侯恂|黄道周|刘宗周|倪元璐|钱谦益|查继佐|方以智/.test(text)) return portraitPick(character, 'generic-ming-scholar-official-01.png', 'generic-ming-scholar-official-02.png');
  return portraitPick(character, 'generic-ming-civil-official-01.png', 'generic-ming-civil-official-02.png');
}

function applyTianqiPortraits(characters) {
  const specificPortraits = listSpecificPortraits();
  for (const character of characters || []) {
    const exact = specificPortraits.get(character.name);
    if (exact) {
      character.portrait = exact;
    } else if (!character.portrait) {
      character.portrait = genericTianqiPortrait(character);
    }
  }
}

function deriveFactionType(name, faction) {
  if (faction.type) return faction.type;
  if (faction.factionType) return faction.factionType;
  if (/幕府|日本/.test(name)) return '幕藩国家';
  if (/汗国|叶尔羌|哈萨克/.test(name)) return '汗国';
  if (/蒙古|瓦刺|土默特|喀尔喀/.test(name)) return '游牧部盟';
  if (/女真|虾夷|阿伊努/.test(name)) return '边外部落联盟';
  if (/大越/.test(name)) return '分裂王国';
  return faction.leaderTitle || '域外势力';
}

function factionDefaults(key, faction, sid, adminByFaction, leaderSpecByFaction) {
  const name = faction.name || key;
  const type = deriveFactionType(name, faction);
  const populationActual = adminByFaction.get(key)?.reduce((sum, d) => sum + (Number(d.population) || 0), 0) || 0;
  const leaderSpec = leaderSpecByFaction.get(key);
  const leaderInfo = faction.leaderInfo || {
    name: faction.leader || leaderSpec?.name || '',
    personality: leaderSpec?.personality || faction.personality || '',
    age: leaderSpec?.age ? String(leaderSpec.age) : '',
    gender: leaderSpec?.gender || '男',
    belief: leaderSpec?.faith || faction.mainstream || '',
    learning: leaderSpec?.learning || '',
    ethnicity: leaderSpec?.ethnicity || '',
    bio: leaderSpec?.bio || faction.desc || faction.description || '',
  };
  const cohesion = faction.cohesion || { political: 45, military: 45, economic: 40, cultural: 55, ethnic: 60, loyalty: 45 };
  const militaryBreakdown = faction.militaryBreakdown || {
    standingArmy: Math.round((Number(faction.militaryStrength) || 0) * 0.35),
    militia: Math.round((Number(faction.militaryStrength) || 0) * 0.5),
    elite: Math.round((Number(faction.militaryStrength) || 0) * 0.15),
    fleet: 0,
  };
  const relations = faction.relations || {};
  return {
    name,
    leader: faction.leader || leaderInfo.name,
    color: faction.color || '#8a6c3d',
    strength: Number(faction.strength) || 45,
    militaryStrength: Number(faction.militaryStrength) || Object.values(militaryBreakdown).reduce((a, b) => a + Number(b || 0), 0),
    economy: Number(faction.economy) || 40,
    courtInfluence: Number(faction.courtInfluence) || 8,
    popularInfluence: Number(faction.popularInfluence) || 30,
    territory: faction.territory || '',
    capital: faction.capital || '',
    ideology: faction.ideology || faction.mainstream || '',
    desc: faction.desc || faction.description || '',
    description: faction.description || faction.desc || '',
    traits: faction.traits || [],
    members: faction.members || faction.leader || '',
    leadership: faction.leadership || {
      ruler: faction.leader || '',
      regent: '',
      general: '',
      chancellor: '',
      spy: '',
    },
    attitude: faction.attitude || '观望',
    mainResources: faction.mainResources || faction.resources || '',
    treasury: faction.treasury || {
      money: Math.round(populationActual * 0.08),
      grain: Math.round(populationActual * (/蒙古|瓦刺|哈萨克|女真|虾夷/.test(name) ? 0.35 : 0.9)),
      cloth: Math.round(populationActual * 0.025),
      note: '历史补丁估算。用于剧本初始资源，不等同精确史料。'
    },
    partyRelations: faction.partyRelations || '补丁势力内部关系待剧本编辑器继续细化。',
    history: faction.history || faction.desc || faction.description || '',
    strengths: faction.strengths || faction.traits || [],
    weaknesses: faction.weaknesses || faction.openingProblems || [],
    strategy: faction.strategy || faction.goal || '',
    playerRelation: faction.playerRelation ?? '未定',
    sid,
    id: key,
    type,
    factionType: faction.factionType || type,
    leaderTitle: faction.leaderTitle || type,
    goal: faction.goal || faction.strategy || '',
    mainstream: faction.mainstream || faction.ideology || '',
    culture: faction.culture || '',
    resources: faction.resources || faction.mainResources || '',
    leaderInfo,
    heirInfo: faction.heirInfo || {
      name: '',
      personality: '',
      age: '',
      gender: '',
      belief: '',
      learning: '',
      ethnicity: leaderInfo.ethnicity || '',
      bio: '补丁势力未指定明确继承人。'
    },
    cohesion,
    militaryBreakdown,
    economicStructure: faction.economicStructure || { agriculture: 35, trade: 25, handicraft: 10, tribute: 30 },
    succession: faction.succession || {
      rule: /幕府|王国/.test(type) ? 'hereditary' : /汗|部盟|台吉/.test(type) ? 'clan_council' : 'customary',
      designatedHeir: '',
      stability: cohesion.political || 45,
    },
    historicalEvents: faction.historicalEvents || [
      { turn: 0, event: '天启七年补入舆图', impact: `${name}作为新地块地图所需势力并入官方剧本。` }
    ],
    internalParties: faction.internalParties || [],
    relations,
    population: faction.population || {
      registered: /明朝廷/.test(name) ? populationActual : 0,
      actual: populationActual,
      hidden: 0,
    },
    techLevel: faction.techLevel || {
      overall: /幕府/.test(name) ? 62 : /汗国|部盟|女真/.test(type) ? 38 : 45,
      agriculture: /幕府|大越|叶尔羌|吐鲁番/.test(name) ? 55 : 25,
      military: Number(faction.strength) || 45,
      navigation: /日本|大越|虾夷/.test(name) ? 45 : 5,
      metallurgy: /日本|瓦刺/.test(name) ? 48 : 32,
    },
    cultureLevel: Number(faction.cultureLevel) || (/日本|大越|叶尔羌/.test(name) ? 62 : 45),
    warState: faction.warState || { active: [], recent: [] },
    economicPolicy: faction.economicPolicy || {
      taxation: /部盟|汗国|部落/.test(type) ? '部众贡纳与实物税' : '地税与商税并行',
      trade: faction.resources || faction.mainResources || '',
      currency: '银两+实物',
    },
    publicOpinion: faction.publicOpinion || { localSupport: Number(faction.popularInfluence) || 35 },
    victoryConditions: faction.victoryConditions || [`维持${name}自主与核心领地。`],
    defeatConditions: faction.defeatConditions || ['首领被俘或核心领地尽失。'],
    longTermStrategy: faction.longTermStrategy || faction.strategy || faction.goal || '',
    knownSpies: faction.knownSpies || [],
    personality: faction.personality || faction.desc || '',
    aiProfile: faction.aiProfile || {
      posture: faction.desc || '',
      decisionStyle: faction.strategy || faction.goal || '',
      riskTolerance: Number(faction.strength) >= 60 ? '中高' : '中低',
      playerVisibleTheme: `${name}是新舆图补齐势力，主要承担边外、域外或羁縻互动。`,
    },
    strategicPriorities: faction.strategicPriorities || uniq([faction.goal, faction.strategy]).slice(0, 4),
    decisionHints: faction.decisionHints || [],
    openingProblems: faction.openingProblems || faction.weaknesses || [],
    tabooMoves: faction.tabooMoves || [],
    npcDecisionHints: faction.npcDecisionHints || faction.decisionHints || [],
    attitudeDetail: faction.attitudeDetail || faction.desc || '',
    offendThresholds: faction.offendThresholds || { warning: -20, hostile: -50, war: -75 },
    allies: faction.allies || [],
    enemies: faction.enemies || [],
    neutrals: faction.neutrals || [],
    prestige: Number(faction.prestige) || Number(faction.strength) || 45,
    foundYear: faction.foundYear || null,
    peakYear: faction.peakYear || null,
    sourceRefs: faction.sourceRefs || [],
    isSupplement: true,
  };
}

const characterSpecs = [
  {
    id: 'char_supp_boshugtu_tumed', name: '卜失兔汗', faction: '土默特蒙古', factionId: 'fac-tumed',
    title: '土默特汗', officialTitle: '土默特汗', role: '汗', age: 46, birthYear: 1581,
    birthplace: '归化城一带', ethnicity: '蒙古', faith: '藏传佛教', culture: '漠南蒙古',
    family: '博尔济吉特·土默特', familyTier: 'steppe_noble', familyRole: '部主',
    personality: '谨慎·守成·依赖互市·惧察哈尔', stance: '守归化互市',
    location: '归化城', learning: '部盟政治·马市交涉', hobbies: '骑射,边市议盟',
    personalGoal: '维持土默特部在归化城与河套的生路，避免被林丹汗吞并。',
    stressSources: ['察哈尔西压', '互市断绝风险', '部众离散'],
    traits: ['cautious', 'diplomatic', 'clan_leader'], stats: { loyalty: 45, ambition: 48, intelligence: 62, military: 58, administration: 50, diplomacy: 66, charisma: 55, integrity: 54, valor: 58, benevolence: 48 },
    bio: '漠南土默特首领。天启七年前后处在明边互市、察哈尔压力与后金东扩之间，首务是保归化城与部众牧场。',
    sourceRefs: ['chahar-khorchin', 'ming-geography']
  },
  {
    id: 'char_supp_abd_latif_yarkand', name: '阿布达勒拉提甫汗', faction: '叶尔羌汗国', factionId: 'fac-yarkand',
    title: '叶尔羌汗', officialTitle: '叶尔羌汗', role: '汗', age: 42, birthYear: 1585,
    birthplace: '叶尔羌城', ethnicity: '察合台-维吾尔', faith: '逊尼派伊斯兰', culture: '维吾尔-察合台',
    family: '察合台后裔·叶尔羌', familyTier: 'royal', familyRole: '汗',
    personality: '沉稳·倚重伯克·重商路', stance: '绿洲汗权',
    location: '叶尔羌城', learning: '伊斯兰法学·汗廷政务·商路税制', hobbies: '听经,议商队,骑猎',
    personalGoal: '维持喀什噶尔至和阗绿洲秩序，压住伯克分权与瓦刺压力。',
    stressSources: ['伯克割据', '瓦刺压力', '商路受阻'],
    traits: ['patient', 'administrator', 'merchant_minded'], stats: { loyalty: 70, ambition: 62, intelligence: 70, military: 52, administration: 68, diplomacy: 63, charisma: 58, integrity: 56, valor: 45, benevolence: 50 },
    bio: '叶尔羌汗国君主，统辖塔里木盆地西南诸绿洲。其权威依赖汗统、宗教人士、伯克与商队税。',
    sourceRefs: ['yarkand', 'central-asia']
  },
  {
    id: 'char_supp_turpan_beg', name: '吐鲁番伯克', faction: '吐鲁番诸伯克', factionId: 'fac-turpan',
    title: '吐鲁番地方伯克', officialTitle: '伯克', role: '伯克', age: 40, birthYear: 1587,
    birthplace: '吐鲁番绿洲', ethnicity: '维吾尔', faith: '逊尼派伊斯兰', culture: '绿洲伯克',
    family: '吐鲁番伯克诸家', familyTier: 'local_elite', familyRole: '绿洲首领',
    personality: '务实·保商路·善观望', stance: '绿洲自治',
    location: '吐鲁番绿洲', learning: '绿洲税务·驿道交涉', hobbies: '商队议价,水渠巡视',
    personalGoal: '在叶尔羌、瓦刺与哈萨克之间保住吐鲁番自治和水源商路。',
    stressSources: ['水源争夺', '汗廷干预', '瓦刺南压'],
    traits: ['pragmatic', 'localist', 'trade_broker'], stats: { loyalty: 42, ambition: 46, intelligence: 60, military: 38, administration: 58, diplomacy: 64, charisma: 48, integrity: 50, valor: 36, benevolence: 47 },
    bio: '代表吐鲁番绿洲地方伯克集团。此人物为地块势力代表，精确姓名待后续史料校订。',
    isHistorical: false,
    sourceRefs: ['yarkand', 'central-asia']
  },
  {
    id: 'char_supp_esim_kazakh', name: '也昔木汗', faction: '哈萨克汗国', factionId: 'fac-kazakh',
    title: '哈萨克汗', officialTitle: '哈萨克汗', role: '汗', age: 59, birthYear: 1568,
    birthplace: '哈萨克草原', ethnicity: '哈萨克', faith: '逊尼派伊斯兰', culture: '哈萨克-钦察',
    family: '成吉思汗系·哈萨克', familyTier: 'royal', familyRole: '汗',
    personality: '威严·尚武·重部盟平衡', stance: '诸玉兹共主',
    location: '游牧汗帐', learning: '草原法统·骑兵动员', hobbies: '骑射,议盟',
    personalGoal: '维持诸玉兹共主地位，争夺锡尔河城镇与天山北路牧场。',
    stressSources: ['诸玉兹分权', '瓦刺东压', '绿洲争夺'],
    traits: ['warlike', 'clan_leader', 'strategist'], stats: { loyalty: 80, ambition: 70, intelligence: 68, military: 78, administration: 45, diplomacy: 56, charisma: 72, integrity: 58, valor: 82, benevolence: 46 },
    bio: '哈萨克汗国重要汗王。17 世纪前期维持汗国声望，依靠诸玉兹骑兵和草原法统平衡各苏丹。',
    sourceRefs: ['kazakh', 'central-asia']
  },
  {
    id: 'char_supp_baibagas_oirat', name: '拜巴噶斯台吉', faction: '瓦刺诸部', factionId: 'fac-oirat',
    title: '和硕特台吉', officialTitle: '台吉', role: '部盟首领', age: 62, birthYear: 1565,
    birthplace: '卫拉特牧地', ethnicity: '卫拉特蒙古', faith: '藏传佛教', culture: '卫拉特蒙古',
    family: '和硕特部', familyTier: 'steppe_noble', familyRole: '台吉',
    personality: '老成·重盟约·守牧场', stance: '卫拉特部盟',
    location: '天山北路诸营', learning: '部盟议政·藏传佛教护持', hobbies: '议盟,巡牧',
    personalGoal: '协调和硕特、准噶尔、杜尔伯特诸部，争取天山北路与伊犁牧场。',
    stressSources: ['诸台吉互争', '哈萨克冲突', '绿洲粮源不足'],
    traits: ['elder', 'mediator', 'steppe_lord'], stats: { loyalty: 55, ambition: 58, intelligence: 65, military: 64, administration: 46, diplomacy: 68, charisma: 60, integrity: 54, valor: 62, benevolence: 45 },
    bio: '卫拉特和硕特重要台吉。作为瓦刺诸部代表人物，用于承接天山北路部盟政治。',
    sourceRefs: ['central-asia']
  },
  {
    id: 'char_supp_wild_jurchen_chief', name: '黑龙江部酋', faction: '野人女真诸部', factionId: 'fac-wild-jurchen',
    title: '黑龙江诸部酋长', officialTitle: '部酋', role: '部酋', age: 44, birthYear: 1583,
    birthplace: '黑龙江水道', ethnicity: '通古斯诸部', faith: '萨满', culture: '东北渔猎',
    family: '黑龙江诸部', familyTier: 'tribal', familyRole: '部酋',
    personality: '警惕·重猎场·重贡貂', stance: '林海自守',
    location: '黑龙江林海', learning: '渔猎·贡市·部落盟誓', hobbies: '猎貂,捕鱼,祭山',
    personalGoal: '以人参、貂皮和东珠换铁器，避免被后金强行编户。',
    stressSources: ['后金招抚', '严寒歉获', '部落互斗'],
    traits: ['tribal', 'hunter', 'independent'], stats: { loyalty: 36, ambition: 35, intelligence: 50, military: 50, administration: 28, diplomacy: 45, charisma: 46, integrity: 48, valor: 62, benevolence: 42 },
    bio: '东北林海野人女真诸部代表人物。此人物为势力代表，精确姓名待后续史料校订。',
    isHistorical: false,
    sourceRefs: ['jurchen']
  },
  {
    id: 'char_supp_matsumae_kinhiro', name: '松前公广', faction: '虾夷地与松前氏', factionId: 'fac-matsumae-ainu',
    title: '松前藩主', officialTitle: '松前藩主', role: '藩主', age: 29, birthYear: 1598,
    birthplace: '松前', ethnicity: '和人', faith: '神道佛教', culture: '日本北海边地',
    family: '松前氏', familyTier: 'daimyo', familyRole: '藩主',
    personality: '守利·谨慎·倚幕府', stance: '北海商权',
    location: '松前馆', learning: '藩政·北海贸易', hobbies: '鹰猎,议商',
    personalGoal: '维持松前氏对虾夷南端贸易的独占权。',
    stressSources: ['阿伊努贸易矛盾', '寒地歉获', '幕府查察'],
    traits: ['merchant_lord', 'cautious', 'frontier'], stats: { loyalty: 62, ambition: 50, intelligence: 58, military: 42, administration: 56, diplomacy: 60, charisma: 48, integrity: 46, valor: 40, benevolence: 42 },
    bio: '松前氏藩主，控制北海道南端商权。其权力边界与阿伊努社会长期交错。',
    sourceRefs: ['matsumae-ainu', 'tokugawa']
  },
  {
    id: 'char_supp_ainu_elder', name: '虾夷诸酋', faction: '虾夷地与松前氏', factionId: 'fac-matsumae-ainu',
    title: '阿伊努诸部酋长', officialTitle: '部酋', role: '部酋', age: 50, birthYear: 1577,
    birthplace: '虾夷地沿海', ethnicity: '阿伊努', faith: '阿伊努信仰', culture: '阿伊努',
    family: '阿伊努诸部', familyTier: 'tribal', familyRole: '部酋',
    personality: '坚忍·重传统·戒和人商权', stance: '北海自治',
    location: '虾夷地沿海聚落', learning: '渔猎·部落传统·海贸交换', hobbies: '祭熊,渔猎',
    personalGoal: '保住阿伊努聚落的渔猎地与对外交换自主。',
    stressSources: ['松前商权压迫', '寒地灾荒', '铁器依赖'],
    traits: ['tribal', 'independent', 'frontier'], stats: { loyalty: 34, ambition: 40, intelligence: 52, military: 45, administration: 30, diplomacy: 50, charisma: 54, integrity: 60, valor: 58, benevolence: 50 },
    bio: '阿伊努诸部代表人物。此人物用于承接虾夷地内部自治与松前商权冲突。',
    isHistorical: false,
    sourceRefs: ['matsumae-ainu']
  },
  {
    id: 'char_supp_tokugawa_iemitsu', name: '德川家光', faction: '日本幕府', factionId: 'fac-tokugawa-japan',
    title: '江户幕府三代将军', officialTitle: '征夷大将军', role: '将军', age: 23, birthYear: 1604,
    birthplace: '江户城', ethnicity: '和人', faith: '神道佛教·朱子学', culture: '日本',
    family: '德川氏', familyTier: 'shogunal', familyRole: '将军',
    personality: '威严·好制度·警惕外教', stance: '幕藩秩序',
    location: '江户城', learning: '武家法度·幕府政务', hobbies: '鹰狩,武艺,能乐',
    personalGoal: '巩固江户幕府权威，约束诸藩并控制海外贸易与基督教。',
    stressSources: ['大御所秀忠仍在', '诸藩约束', '南蛮贸易与基督教'],
    traits: ['authoritarian', 'administrator', 'shogun'], stats: { loyalty: 100, ambition: 82, intelligence: 76, military: 62, administration: 82, diplomacy: 58, charisma: 72, integrity: 66, valor: 55, benevolence: 46 },
    bio: '德川幕府第三代将军。1627 年已就任将军，父秀忠仍以大御所身份保持影响，幕藩秩序正在强化。',
    sourceRefs: ['tokugawa']
  },
  {
    id: 'char_supp_tokugawa_hidetada', name: '德川秀忠', faction: '日本幕府', factionId: 'fac-tokugawa-japan',
    title: '江户幕府大御所', officialTitle: '大御所', role: '大御所', age: 48, birthYear: 1579,
    birthplace: '远江滨松', ethnicity: '和人', faith: '神道佛教·朱子学', culture: '日本',
    family: '德川氏', familyTier: 'shogunal', familyRole: '大御所',
    personality: '稳重·守法度·重家门', stance: '幕后监国',
    location: '江户城', learning: '幕府政务·诸藩控制', hobbies: '茶事,武家礼仪',
    personalGoal: '扶稳家光，继续以大御所身份压制诸藩。',
    stressSources: ['家光独断渐强', '诸藩忠诚', '外贸管制'],
    traits: ['elder', 'administrator', 'dynastic'], stats: { loyalty: 95, ambition: 58, intelligence: 72, military: 55, administration: 78, diplomacy: 62, charisma: 60, integrity: 68, valor: 48, benevolence: 50 },
    bio: '德川家康之子、二代将军。1627 年虽已让位家光，但仍以大御所身份掌握实权。',
    sourceRefs: ['tokugawa']
  },
  {
    id: 'char_supp_le_than_tong', name: '黎神宗', faction: '大越黎郑阮格局', factionId: 'fac-dai-viet',
    title: '后黎皇帝', officialTitle: '后黎皇帝', role: '皇帝', age: 20, birthYear: 1607,
    birthplace: '升龙', ethnicity: '越', faith: '儒教', culture: '大越',
    family: '后黎皇室', familyTier: 'royal', familyRole: '皇帝',
    personality: '温和·受制·重名分', stance: '名义皇统',
    location: '升龙', learning: '儒学·宫廷礼法', hobbies: '读书,祭礼',
    personalGoal: '维持后黎皇统名义，避免完全沦为郑主傀儡。',
    stressSources: ['郑主挟制', '阮主割据', '南北战争'],
    traits: ['figurehead', 'scholarly', 'constrained'], stats: { loyalty: 68, ambition: 38, intelligence: 58, military: 20, administration: 42, diplomacy: 52, charisma: 50, integrity: 62, valor: 25, benevolence: 58 },
    bio: '后黎皇帝。1627 年郑阮战争爆发，皇权名义仍在，实际政权多为郑主掌握。',
    sourceRefs: ['vietnam']
  },
  {
    id: 'char_supp_trinh_trang', name: '郑梉', faction: '大越黎郑阮格局', factionId: 'fac-dai-viet',
    title: '郑主', officialTitle: '郑主', role: '北方权臣', age: 50, birthYear: 1577,
    birthplace: '清化', ethnicity: '越', faith: '儒教', culture: '大越',
    family: '郑氏·东京', familyTier: 'princely', familyRole: '郑主',
    personality: '强硬·掌兵·重北伐', stance: '挟黎制阮',
    location: '升龙', learning: '军政·儒臣用事', hobbies: '阅兵,听奏',
    personalGoal: '以后黎名义压制阮氏，统一大越。',
    stressSources: ['阮氏抗命', '财政军费', '皇权名分制约'],
    traits: ['warlike', 'regent', 'ambitious'], stats: { loyalty: 45, ambition: 82, intelligence: 70, military: 74, administration: 68, diplomacy: 55, charisma: 66, integrity: 45, valor: 70, benevolence: 38 },
    bio: '北方郑主，掌握后黎朝廷实权。1627 年对阮福源开战，郑阮长期对峙由此展开。',
    sourceRefs: ['vietnam']
  },
  {
    id: 'char_supp_nguyen_phuc_nguyen', name: '阮福源', faction: '大越黎郑阮格局', factionId: 'fac-dai-viet',
    title: '阮主', officialTitle: '阮主', role: '南方主君', age: 64, birthYear: 1563,
    birthplace: '顺化', ethnicity: '越', faith: '儒教·佛教', culture: '大越南方',
    family: '阮氏·广南', familyTier: 'princely', familyRole: '阮主',
    personality: '沉着·守成·重海贸', stance: '顺化割据',
    location: '顺化', learning: '边镇经营·海贸财政', hobbies: '议港,筑垒',
    personalGoal: '守住顺化以南，借海贸与南进维持阮氏自主。',
    stressSources: ['郑主北压', '军费压力', '海贸依赖'],
    traits: ['defensive', 'merchant_minded', 'founder'], stats: { loyalty: 42, ambition: 72, intelligence: 72, military: 66, administration: 74, diplomacy: 62, charisma: 60, integrity: 55, valor: 58, benevolence: 50 },
    bio: '广南阮主。1627 年抗拒郑主号令，开启郑阮战争，南方政权逐渐稳固。',
    sourceRefs: ['vietnam']
  },
  {
    id: 'char_supp_choghtu_khong_tayiji', name: '却图汗', faction: '喀尔喀蒙古', factionId: 'fac-khalkha',
    title: '喀尔喀台吉', officialTitle: '台吉', role: '部盟贵族', age: 46, birthYear: 1581,
    birthplace: '喀尔喀牧地', ethnicity: '蒙古', faith: '藏传佛教', culture: '喀尔喀蒙古',
    family: '喀尔喀诸汗', familyTier: 'steppe_noble', familyRole: '台吉',
    personality: '尚武·好名·联察哈尔', stance: '漠北强藩',
    location: '漠北汗帐', learning: '部盟议政·骑射', hobbies: '骑射,议盟',
    personalGoal: '在察哈尔、瓦刺与后金之间保持漠北部众声望。',
    stressSources: ['瓦刺压力', '察哈尔号令', '部盟分裂'],
    traits: ['warlike', 'steppe_lord', 'ambitious'], stats: { loyalty: 45, ambition: 68, intelligence: 58, military: 72, administration: 40, diplomacy: 50, charisma: 60, integrity: 48, valor: 78, benevolence: 38 },
    bio: '喀尔喀蒙古重要贵族，后与西藏、青海局势相联。此处作为漠北喀尔喀势力代表之一。',
    sourceRefs: ['central-asia', 'chahar-khorchin']
  },
  {
    id: 'char_supp_tusheet_gombodorj', name: '土谢图汗衮布', faction: '喀尔喀蒙古', factionId: 'fac-khalkha',
    title: '喀尔喀土谢图汗', officialTitle: '汗', role: '汗', age: 33, birthYear: 1594,
    birthplace: '漠北喀尔喀', ethnicity: '蒙古', faith: '藏传佛教', culture: '喀尔喀蒙古',
    family: '土谢图汗部', familyTier: 'steppe_noble', familyRole: '汗',
    personality: '稳健·保牧场·重三汗平衡', stance: '漠北自守',
    location: '喀尔喀汗帐', learning: '部盟平衡·寺院关系', hobbies: '巡牧,礼佛',
    personalGoal: '维持喀尔喀三汗平衡，避免被察哈尔、瓦刺、后金牵入消耗战。',
    stressSources: ['三汗分立', '瓦刺压力', '后金外交渗透'],
    traits: ['cautious', 'clan_leader', 'buddhist'], stats: { loyalty: 58, ambition: 50, intelligence: 62, military: 58, administration: 46, diplomacy: 62, charisma: 56, integrity: 55, valor: 54, benevolence: 46 },
    bio: '喀尔喀土谢图汗部代表人物，用于承接漠北三汗格局与草原外交。',
    sourceRefs: ['central-asia', 'chahar-khorchin']
  }
];

function characterDefaults(spec, sid) {
  const stats = spec.stats || {};
  const traits = spec.traits || [];
  const personalGoal = spec.personalGoal || spec.stance || '';
  return {
    name: spec.name,
    zi: spec.zi || '',
    haoName: spec.haoName || '',
    title: spec.title || spec.officialTitle || spec.role || '',
    officialTitle: spec.officialTitle || spec.title || '',
    role: spec.role || spec.officialTitle || '',
    type: spec.type || '历史人物',
    class: spec.class || '域外势力',
    isHistorical: spec.isHistorical !== false,
    alive: spec.alive !== false,
    age: spec.age || 40,
    gender: spec.gender || '男',
    birthYear: spec.birthYear || (1627 - (spec.age || 40)),
    birthplace: spec.birthplace || '',
    ethnicity: spec.ethnicity || '',
    faith: spec.faith || '',
    culture: spec.culture || '',
    learning: spec.learning || '',
    appearance: spec.appearance || `${spec.title || spec.officialTitle || '首领'}装束，常随护从与书记。`,
    diction: spec.diction || '言辞多用本部旧例与现实利害，遇明廷使节则重礼数。',
    personality: spec.personality || '',
    location: spec.location || '',
    rankLevel: spec.rankLevel ?? 5,
    loyalty: stats.loyalty ?? 50,
    ambition: stats.ambition ?? 50,
    intelligence: stats.intelligence ?? 55,
    valor: stats.valor ?? 45,
    military: stats.military ?? 45,
    administration: stats.administration ?? 45,
    management: stats.management ?? stats.administration ?? 45,
    charisma: stats.charisma ?? 50,
    diplomacy: stats.diplomacy ?? 50,
    benevolence: stats.benevolence ?? 45,
    integrity: stats.integrity ?? 50,
    stance: spec.stance || '',
    faction: spec.faction,
    factionId: spec.factionId,
    party: '',
    partyRank: '',
    family: spec.family || '',
    familyTier: spec.familyTier || 'local_elite',
    familyRole: spec.familyRole || '',
    familyStatus: 'active',
    clanPrestige: spec.clanPrestige ?? 50,
    mentor: '',
    hobbies: spec.hobbies || '',
    innerThought: spec.innerThought || personalGoal,
    personalGoal,
    personalGoals: uniq([personalGoal]),
    stressSources: spec.stressSources || [],
    resources: spec.resources || {
      privateWealth: { money: 20000, grain: 1000, cloth: 300 },
      publicPurse: { money: 0, grain: 0, cloth: 0 },
      fame: spec.clanPrestige ?? 40,
      health: 72,
      stress: 35,
    },
    career: spec.career || [
      { year: spec.birthYear || 1627 - (spec.age || 40), title: '出生', note: spec.birthplace || '', date: `${spec.birthYear || 1627 - (spec.age || 40)}年`, desc: spec.birthplace || '', milestone: false },
      { year: 1627, title: spec.officialTitle || spec.title || spec.role || '首领', note: '天启七年新舆图补入人物。', date: '1627年', desc: '对应补充势力的开局人物。', milestone: true },
    ],
    familyMembers: spec.familyMembers || [],
    relations: spec.relations || {},
    rels: spec.rels || [],
    dialogues: spec.dialogues || [],
    skills: spec.skills || [],
    traitIds: traits,
    traits,
    speechStyle: spec.speechStyle || '沉稳而重现实利害',
    behaviorMode: spec.behaviorMode || 'regional_leader',
    playerRelation: spec.playerRelation ?? 0,
    portrait: spec.portrait || '',
    secret: spec.secret || '',
    valueSystem: spec.valueSystem || {
      order: 60,
      profit: 55,
      faith: 45,
      honor: 45,
      survival: 80,
    },
    vassalType: spec.vassalType || '',
    wuchangOverride: spec.wuchangOverride || {},
    occupation: spec.occupation || spec.officialTitle || spec.title || '',
    aiPersonaText: spec.aiPersonaText || `${spec.name}关心${personalGoal || '本部存续'}。`,
    importance: spec.importance || 'regional',
    historicalSources: spec.sourceRefs || [],
    sid,
    id: spec.id,
    isSupplement: true,
    dataConfidence: spec.isHistorical === false ? 'representative' : 'medium',
    bio: spec.bio || '',
  };
}

function relationId(from, to, type) {
  return `rel_supp_${Buffer.from(`${from}-${to}-${type}`).toString('hex').slice(0, 18)}`;
}

function addUniqueByName(list, item, added) {
  if (list.some(x => x.name === item.name || (item.id && x.id === item.id))) return false;
  list.push(item);
  added.push(item.name);
  return true;
}

function main() {
  const scenario = readJson(scenarioPath);
  const supplement = readJson(supplementPath);
  const generatedAdmin = fs.existsSync(generatedAdminPath) ? readJson(generatedAdminPath) : {};
  const sid = scenario.id || 'sc-tianqi7-1627';
  const backupDir = path.join(path.dirname(scenarioPath), '_archived-backups');
  fs.mkdirSync(backupDir, { recursive: true });
  const backupPath = path.join(backupDir, `${path.basename(scenarioPath)}.pre-historical-supplement-${stamp()}.bak`);
  fs.copyFileSync(scenarioPath, backupPath);

  const originalFactionKeys = new Set();
  for (const faction of scenario.factions || []) Object.keys(faction).forEach(key => originalFactionKeys.add(key));
  const originalCharacterCommonKeys = new Set();
  const charFreq = {};
  for (const character of scenario.characters || []) {
    for (const key of Object.keys(character)) charFreq[key] = (charFreq[key] || 0) + 1;
  }
  const commonThreshold = Math.ceil((scenario.characters || []).length * 0.75);
  Object.entries(charFreq).forEach(([key, count]) => { if (count >= commonThreshold) originalCharacterCommonKeys.add(key); });

  const adminByFaction = new Map();
  for (const record of Object.values(supplement.adminRecords || {})) {
    const factionId = record.factionId || 'fac-ming';
    if (!adminByFaction.has(factionId)) adminByFaction.set(factionId, []);
    adminByFaction.get(factionId).push(record);
  }

  const leaderSpecByFaction = new Map();
  for (const spec of characterSpecs) {
    if (!leaderSpecByFaction.has(spec.factionId)) leaderSpecByFaction.set(spec.factionId, spec);
  }

  const addedFactions = [];
  scenario.factions ||= [];
  for (const [factionId, faction] of Object.entries(supplement.factions || {})) {
    if (scenario.factions.some(item => item.name === faction.name || item.id === factionId)) continue;
    const normalized = factionDefaults(factionId, faction, sid, adminByFaction, leaderSpecByFaction);
    for (const key of originalFactionKeys) {
      if (!(key in normalized)) normalized[key] = Array.isArray((scenario.factions[0] || {})[key]) ? [] : '';
    }
    scenario.factions.push(normalized);
    addedFactions.push(normalized.name);
  }

  scenario.adminHierarchy ||= {};
  const addedAdminDivisions = [];
  const groupNameByFaction = {
    'fac-ming': 'player',
    'fac-chahar': 'chahar',
    'fac-tumed': 'tumed',
    'fac-yarkand': 'yarkand',
    'fac-turpan': 'turpan',
    'fac-kazakh': 'kazakh',
    'fac-oirat': 'oirat',
    'fac-wild-jurchen': 'wildJurchen',
    'fac-matsumae-ainu': 'matsumaeAinu',
    'fac-tokugawa-japan': 'tokugawaJapan',
    'fac-dai-viet': 'daiViet',
    'fac-khalkha': 'khalkha',
  };
  const generatedSupplementDivisions = [];
  for (const group of Object.values(generatedAdmin || {})) {
    for (const division of group.divisions || []) {
      if (division.isSupplement) generatedSupplementDivisions.push(division);
    }
  }
  const movedAdminDivisions = [];
  for (const division of generatedSupplementDivisions) {
    const groupKey = division.name === '朵甘思宣慰司' ? 'dokham' : (groupNameByFaction[division.factionId] || `supplement-${division.factionId}`);
    for (const [existingKey, existingGroup] of Object.entries(scenario.adminHierarchy)) {
      if (existingKey === groupKey || !Array.isArray(existingGroup.divisions)) continue;
      const before = existingGroup.divisions.length;
      existingGroup.divisions = existingGroup.divisions.filter(item => item.name !== division.name && item.id !== division.id);
      if (existingGroup.divisions.length !== before) movedAdminDivisions.push(`${division.name}:${existingKey}->${groupKey}`);
    }
    if (!scenario.adminHierarchy[groupKey]) {
      scenario.adminHierarchy[groupKey] = {
        factionId: division.factionId,
        factionName: division.factionName,
        isSupplement: true,
        divisions: [],
      };
    }
    const group = scenario.adminHierarchy[groupKey];
    group.factionId ||= division.factionId;
    group.factionName ||= division.factionName;
    group.divisions ||= [];
    if (group.divisions.some(item => item.name === division.name || item.id === division.id)) continue;
    group.divisions.push(division);
    addedAdminDivisions.push(division.name);
  }

  const addedCharacters = [];
  scenario.characters ||= [];
  const newCharacters = characterSpecs.map(spec => {
    const character = characterDefaults(spec, sid);
    for (const key of originalCharacterCommonKeys) {
      if (!(key in character)) character[key] = '';
    }
    return character;
  });
  for (const character of newCharacters) addUniqueByName(scenario.characters, character, addedCharacters);

  const addedFactionRelations = [];
  scenario.factionRelations ||= [];
  const existingFactionRelationKeys = new Set(scenario.factionRelations.map(r => `${r.from}|${r.to}|${r.type}`));
  const factionNames = new Set(scenario.factions.map(f => f.name));
  for (const faction of scenario.factions.filter(f => f.isSupplement)) {
    for (const [target, value] of Object.entries(faction.relations || {})) {
      if (!factionNames.has(target)) continue;
      const numeric = Number(value);
      const type = numeric <= -65 ? 'war' : numeric <= -25 ? 'hostile' : numeric >= 45 ? 'friendly' : 'neutral';
      const key = `${faction.name}|${target}|${type}`;
      if (existingFactionRelationKeys.has(key)) continue;
      scenario.factionRelations.push({ from: faction.name, to: target, type, value: Number.isFinite(numeric) ? numeric : 0, desc: `${faction.name}与${target}的补丁外交关系。` });
      existingFactionRelationKeys.add(key);
      addedFactionRelations.push(`${faction.name}->${target}`);
    }
  }

  const relationSpecs = [
    ['德川家光', '德川秀忠', '父子·大御所', 72, '将军与大御所并立，父子同治而权力渐移。'],
    ['黎神宗', '郑梉', '君臣·挟制', -35, '后黎皇帝名义在上，郑主实掌北方政权。'],
    ['郑梉', '阮福源', '敌对', -75, '郑阮战争开局，南北相持。'],
    ['卜失兔汗', '林丹汗', '部盟敌意', -55, '土默特受察哈尔压力，部盟关系紧张。'],
    ['阿布达勒拉提甫汗', '吐鲁番伯克', '宗主·自治', 25, '绿洲伯克保持自治，同时受叶尔羌汗权影响。'],
  ];
  const addedRelations = [];
  scenario.relations ||= [];
  const existingRelations = new Set(scenario.relations.map(r => `${r.from}|${r.to}|${r.type}`));
  for (const [from, to, type, value, desc] of relationSpecs) {
    const key = `${from}|${to}|${type}`;
    if (existingRelations.has(key)) continue;
    scenario.relations.push({ from, to, type, value, desc, sid, id: relationId(from, to, type) });
    existingRelations.add(key);
    addedRelations.push(`${from}->${to}`);
  }

  const addedFamilies = [];
  scenario.families ||= [];
  for (const family of uniq(newCharacters.map(c => c.family)).filter(Boolean)) {
    if (scenario.families.some(item => item.name === family)) continue;
    const members = newCharacters.filter(c => c.family === family).map(c => c.name);
    scenario.families.push({
      name: family,
      tier: newCharacters.find(c => c.family === family)?.familyTier || 'local_elite',
      prestige: newCharacters.find(c => c.family === family)?.clanPrestige || 50,
      ancestralSeat: newCharacters.find(c => c.family === family)?.birthplace || '',
      founder: '',
      notableAncestors: [],
      currentHead: members[0] || '',
      heir: '',
      members,
      wealth: '随势力资源而定',
      politicalStance: newCharacters.find(c => c.family === family)?.stance || '',
      prominence: 'supplement',
      marriages: '',
      feuds: '',
      tradition: newCharacters.find(c => c.family === family)?.culture || '',
      recentFortunes: '天启七年新舆图补入。',
      note: '历史补丁自动补入家族，用于人物志字段完整性。'
    });
    addedFamilies.push(family);
  }

  const supplementFactionMissing = {};
  for (const faction of scenario.factions.filter(f => f.isSupplement)) {
    supplementFactionMissing[faction.name] = [...originalFactionKeys].filter(key => !(key in faction));
  }
  const supplementCharacterMissing = {};
  for (const character of scenario.characters.filter(c => c.isSupplement)) {
    supplementCharacterMissing[character.name] = [...originalCharacterCommonKeys].filter(key => !(key in character));
  }

  scenario.refFiles ||= [];
  const supplementRef = 'web/data/scenario-supplements/tianqi7-ming2-historical-supplement.json';
  if (!scenario.refFiles.includes(supplementRef)) scenario.refFiles.push(supplementRef);
  scenario.isFullyDetailed = true;
  applyTianqiPortraits(scenario.characters);

  writeJson(scenarioPath, scenario);
  fs.mkdirSync(path.dirname(auditOut), { recursive: true });
  writeJson(auditOut, {
    scenarioPath,
    backupPath,
    supplementPath,
    addedFactions,
    addedAdminDivisions,
    movedAdminDivisions,
    addedCharacters,
    addedFamilies,
    addedFactionRelations,
    addedRelations,
    fieldAudit: {
      originalFactionKeyCount: originalFactionKeys.size,
      originalCharacterCommonKeyCount: originalCharacterCommonKeys.size,
      supplementFactionMissing,
      supplementCharacterMissing,
    },
  });

  console.log(JSON.stringify({
    ok: true,
    scenarioPath,
    backupPath,
    auditOut,
    addedFactions: addedFactions.length,
    addedAdminDivisions: addedAdminDivisions.length,
    movedAdminDivisions: movedAdminDivisions.length,
    addedCharacters: addedCharacters.length,
    addedFamilies: addedFamilies.length,
  }, null, 2));
}

main();
