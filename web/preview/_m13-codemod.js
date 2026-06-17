// M13 codemod — specialist 表单字段标签汉化（能力值用游戏官方名）。
const fs = require('fs');
const path = 'scenario-editor-reset-app.js';
let s = fs.readFileSync(path, 'utf8');
const orig = s;
let edits = [];
function replaceOnce(anchor, repl, tag) {
  const n = s.split(anchor).length - 1;
  if (n !== 1) throw new Error('ANCHOR ' + tag + ' matched ' + n + ' (need 1)');
  s = s.replace(anchor, repl);
  edits.push(tag);
}

// 1) 字典 + helper：插在 specialistSchema 之前
const DICT = `  // M13 · specialist 友好表单字段标签字典。能力值用正式游戏官方名（phase8-formal-modules.js
  // 的人物显示：忠诚/野心/智谋/武勇/军事/政务/管理/魅力/外交/仁德/廉节）；其余用标准名；
  // 未收录回退英文 key（优雅降级，绝不丢字段）。
  var SPECIALIST_FIELD_LABELS = {
    // 能力值（游戏官方名）
    intelligence: '智谋', valor: '武勇', military: '军事', administration: '政务',
    management: '管理', charisma: '魅力', diplomacy: '外交', benevolence: '仁德',
    integrity: '廉节', loyalty: '忠诚', wisdom: '睿智', honesty: '诚信',
    righteousness: '忠义', propriety: '守礼', benevolenceTrait: '仁善', morale: '士气',
    ambition: '野心', health: '健康', stress: '压力',
    // 身份与基本
    id: '编号', sid: '内部编号', name: '姓名', zi: '表字', haoName: '名号', displayName: '显示名',
    title: '头衔', officialTitle: '官职', role: '身份', occupation: '职业', rankLevel: '品级',
    class: '阶层', age: '年龄', gender: '性别', birthYear: '生年', birthplace: '籍贯',
    birthTime: '生辰', alive: '在世', dead: '已殁', isHistorical: '史实人物', isFictional: '虚构人物',
    isPlayer: '玩家角色', isRoyal: '宗室', royalRelation: '宗室关系', ethnicity: '族属',
    faith: '信仰', culture: '文化', learning: '学识', location: '所在', importance: '重要度',
    // 人格/叙事
    appearance: '相貌', diction: '言辞', persona: '人物设定', personality: '性格',
    personalGoal: '个人志向', innerThought: '内心独白', coreMotivations: '核心动机',
    redLines: '底线', aiPersonaText: 'AI 人格', behaviorMode: '行为模式', speechStyle: '言谈风格',
    secret: '秘辛', hobbies: '喜好', bio: '小传', valueSystem: '价值观', desc: '简介', description: '描述',
    // 党派/立场
    faction: '所属势力', factionId: '势力编号', party: '党派', partyRank: '党内地位',
    partyInfluence: '党派影响力', stance: '立场', superior: '上司', mentor: '师承',
    // 家族/亲属
    family: '家族', familyTier: '门第', familyRole: '家中角色', familyStatus: '家族状况',
    clanPrestige: '族望', lineage: '世系', father: '父', mother: '母', spouse: '配偶',
    spouseRank: '配偶位分', vassalType: '附庸类型', playerRelation: '与玩家关系',
    portrait: '立绘', founder: '始祖', currentHead: '当家', heir: '继承人', tier: '等第',
    wealth: '财富', prestige: '威望', ancestralSeat: '祖籍', tradition: '门风',
    politicalStance: '政治立场', members: '成员', notableAncestors: '显祖', marriages: '联姻', feuds: '世仇',
    // 势力
    leader: '领袖', leaderTitle: '领袖头衔', coLeader: '副领袖', color: '色标', capital: '治所',
    territory: '疆域', strength: '实力', militaryStrength: '军力', economy: '经济', fiscalCondition: '财政',
    courtInfluence: '朝堂影响', popularInfluence: '民间影响', factionType: '势力类型',
    loyaltyToSong: '忠宋程度', cultureLevel: '文教程度', population: '人口', internalTension: '内部张力',
    ideology: '理念', traits: '特质', attitude: '态度', mainstream: '主流派', currentMorale: '士气',
    side: '阵营', primaryTarget: '首要目标', primaryThreat: '首要威胁', goal: '目标', strategy: '方略',
    influence: '影响力', stateDescription: '状态描述', resources: '资源', mainResources: '主要资源',
    longTermStrategy: '长远方略', allies: '盟友', enemies: '敌对', neutrals: '中立',
    // 事件/时间线
    type: '类型', trigger: '触发', effect: '效果', linkedChars: '关联人物', linkedFactions: '关联势力',
    triggered: '已触发', year: '年', month: '月', day: '日',
    // 党派
    foundYear: '创立年', peakYear: '鼎盛年', base: '根基', org: '组织', policyStance: '政策立场',
    longGoal: '长远目标',
    // 物品
    category: '类别', owner: '持有者', quantity: '数量', value: '价值', effects: '效果', tags: '标签', era: '时代'
  };
  function specialistFieldLabel(key) {
    return (key && SPECIALIST_FIELD_LABELS[key]) || key;
  }

  function specialistSchema(field, entity) {`;
replaceOnce('  function specialistSchema(field, entity) {', DICT, 'dict');

// 2) renderSpecialistInput 标签：英文 key → 中文 + 小英文 key
const LBL_ANCHOR = "    var labelHtml = '<span>' + escapeHtml(key) + aliasNote + '</span>';";
const LBL_NEW =
  "    var cnLabel = specialistFieldLabel(key);\n" +
  "    var keyTag = cnLabel !== key ? ' <em class=\"spec-key\">' + escapeHtml(key) + '</em>' : '';\n" +
  "    var labelHtml = '<span>' + escapeHtml(cnLabel) + keyTag + aliasNote + '</span>';";
replaceOnce(LBL_ANCHOR, LBL_NEW, 'label');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta bytes:', s.length - orig.length);
