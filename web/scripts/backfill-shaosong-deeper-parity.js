#!/usr/bin/env node
// scripts/backfill-shaosong-deeper-parity.js
// 2026-05-21·Slice A·补绍宋 hub 字段·跟天启对齐 chaoyi / variables / relations / openingLetters / 长文本
//
// Slice B 留 adminHierarchy 富化 (165 stub 子节点 → 加 population/fiscal/governor 等 38 字段)
// Slice C 留 events 0→30+·characters 73→120+·map regions·NPC parity 检
//
// 用法·node web/scripts/backfill-shaosong-deeper-parity.js [--dry-run] [--force]

'use strict';

const fs = require('fs');
const path = require('path');

const SCENARIO_PATH = path.resolve(__dirname, '..', '..', 'scenarios', '绍宋·建炎元年八月（官方）.json');
const SID = 'sc-shaosong-1127';  // 借天启的 var sid 模式·绍宋专属

function stamp() {
  const d = new Date();
  return d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0') + '-' +
    String(d.getUTCHours()).padStart(2, '0') +
    String(d.getUTCMinutes()).padStart(2, '0') +
    String(d.getUTCSeconds()).padStart(2, '0');
}

function rid(prefix) {
  return prefix + '_' + Math.random().toString(36).slice(2, 12);
}

// ── 1·chaoyi 配置·建炎元年 南渡草创·朝议沿北宋·主战 vs 主和 ──
function buildChaoyi() {
  return {
    enabled: true,
    audienceHall: '应天府紫宸殿',  // 建炎元年都应天府·紫宸殿为常朝
    chaoName: '常朝',              // 南宋承北宋·每日早朝
    shuoChaoName: '朔朝',           // 每月初一大朝
    openingRites: ['imperialEnter', 'baiwu', 'kouhou'],  // 入殿·拜舞·叩首
    strictThreshold: {
      prestige: 65,                 // 南渡草创·威严比天启低
      power: 60
    },
    directSpeakRank: 4,             // 四品以上直接奏对·士大夫风骨重
    deptOptions: [
      '尚书省',   // 行政·下辖六部
      '中书省',   // 议政·制诰
      '门下省',   // 审议·封驳 (南宋后期渐合并·建炎初尚存名)
      '枢密院',   // 军政
      '吏部', '户部', '礼部', '兵部', '刑部', '工部',
      '御史台',   // 监察 (南宋承北宋·非都察院)
      '翰林学士院', // 制诰 / 经筵
      '太常寺'    // 礼仪
    ],
    factionMap: {
      '主战': { tone: 'support', allyClass: 'civil' },     // 李纲·宗泽·张所·赵鼎·张浚
      '主和': { tone: 'oppose', allyClass: 'civil' },      // 黄潜善·汪伯彦·(秦桧 1130 之后)
      '务实': { tone: 'mediate', allyClass: 'civil' },      // 吕好问·朱胜非·吕颐浩
      '武将': { tone: 'neutral', allyClass: 'wu' },         // 御营 / 西军 / 北方义军总称
      '外戚': { tone: 'neutral', allyClass: 'consort' },    // 孟氏 / 韦氏家
      '宗室': { tone: 'neutral', allyClass: 'zongshi' },    // 赵桓系·赵旉等
      '中立': { tone: 'neutral', allyClass: 'civil' }
    },
    enabledTypes: [
      'routine',          // 常朝·百官奏事
      'request',          // 请旨·拟诏
      'warning',          // 谏言·御史风闻
      'emergency',        // 紧急·边报 / 兵变
      'personnel',        // 人事·官职升黜
      'confrontation',    // 当面诘难
      'joint_petition',   // 联名上奏 (主战派联名常用)
      'personal_plea'     // 私下面奏·北狩家眷情切
    ],
    fixedAgenda: []
  };
}

// ── 2·variables·21 项·南宋建炎元年特有指标 ──
function buildVariables() {
  const V = (name, value, opts) => ({
    name, value,
    min: opts.min || 0,
    max: opts.max || 100,
    cat: opts.cat,
    desc: opts.desc,
    inversed: !!opts.inversed,
    unit: opts.unit,
    sid: SID,
    id: rid('var'),
    color: opts.color || '#c9a84c',
    icon: opts.icon || '',
    visible: opts.visible !== false
  });
  return [
    // 党派 (4)
    V('主战派权势', 35, { cat: '党派', desc: '李纲被罢后主战派失势·宗泽孤悬·张所等亦排挤。<50 即朝廷无人言战。' }),
    V('主和派权势', 65, { cat: '党派', desc: '黄潜善 / 汪伯彦集团把持中枢。>70 即主战派全面清洗。', inversed: true }),
    V('务实派调和度', 35, { cat: '党派', desc: '吕好问 / 朱胜非等斡旋·欲调主战主和。>60 可促成合议。' }),
    V('党争烈度', 70, { cat: '党派', desc: '主战 vs 主和倾轧·李纲罢相未平。>80 即朝堂全面瘫痪。', inversed: true }),

    // 外交·与金 (3)
    V('与金和议状态', 10, { cat: '外交', desc: '靖康刚过半年·和议无从谈起。>50 才有可能议和·>90 即正式签盟。' }),
    V('北狩二宗音信', 5, { cat: '外交', desc: '徽钦二宗及大量宫眷被掳北行·音信几断。>30 才有零星消息。' }),
    V('回銮可能', 0, { cat: '外交', desc: '迎回二圣的现实可能性。>30 已是奇迹·>60 即金主政权动摇。' }),

    // 财政·经济 (4)
    V('江南漕粮入京', 25, { cat: '财政', desc: '东南税赋未及收齐·漕路因战事不畅。>60 财政恢复有望。' }),
    V('川蜀供给度', 60, { cat: '财政', desc: '川蜀未受兵燹·赋税仍可解·然路远·只能部分输出。' }),
    V('财政恢复指数', 18, { cat: '财政', desc: '北宋汴梁府库尽失·南渡仰赖东南川蜀·恢复缓慢。<25 即朝官欠俸三月。', inversed: false }),
    V('物价腾涌', 75, { cat: '经济', desc: '战乱 + 北人南渡 + 漕断·江南米价飞涨。>80 即民间断粮。', inversed: true }),

    // 军事 (4)
    V('御营战力', 50, { cat: '军事', desc: '赵构嫡系·张俊 / 韩世忠 / 杨沂中等领·尚未完成扩编。' }),
    V('西军独立化', 60, { cat: '军事', desc: '曲端跋扈·吴玠忍·西军渐成藩镇。>80 即名存实亡。', inversed: true }),
    V('北方义军规模', 40, { cat: '军事', desc: '河北 / 太行 / 八字军·王彦李彦仙等坚持抗金。' }),
    V('军队哗变风险', 55, { cat: '军事', desc: '南渡兵未编整·欠饷军议·苗刘之兆已蓄。>70 即兵变爆发。', inversed: true }),

    // 民生·环境 (4)
    V('流民南渡数', 70, { cat: '民生', desc: '北方士民南奔潮·建炎元年估 100 万 + 涌入江浙。', inversed: true }),
    V('江南瘟疫指数', 35, { cat: '环境', desc: '难民聚集·尸横遍野·疫病渐起。>60 触发大疫。', inversed: true }),
    V('黄河泛滥度', 45, { cat: '环境', desc: '黄河自靖康年改道夺淮·淮河流域泛滥。', inversed: true }),
    V('农耕恢复', 30, { cat: '民生', desc: '北方田地荒芜·南方收稻·秋收在即·尚可支撑。' }),

    // 政治·文化 (2)
    V('言路通塞', 55, { cat: '政治', desc: '主战派言路被压·主和派把持·御史台沉默。' }),
    V('士林清议', 40, { cat: '文化', desc: '太学诸生 / 江南文人议政·伊洛理学渐起。' })
  ];
}

// ── 3·relations 扩到 30+·关键 char-char + faction-faction ──
function buildExtraRelations(existing) {
  const R = (from, to, type, value, desc) => ({
    from, to, type, value, desc, sid: SID, id: rid('rel')
  });
  // 已有 relations 18 条·补 ~15 条关键关系 (faction-faction + 主战主和领袖)
  // 注·existing 是数组·我们仅 push 不重复的
  const extras = [
    // 派系领袖之间
    R('李纲', '宗泽', '同党', 90, '皆主战派核心·李纲拜相调宗泽守汴'),
    R('李纲', '黄潜善', '政敌', -85, '主战 vs 主和·黄潜善谗罢李纲'),
    R('李纲', '汪伯彦', '政敌', -75, '主战 vs 主和·汪伯彦同黄潜善排李'),
    R('黄潜善', '汪伯彦', '同党', 88, '主和派两核心·共持中枢'),
    R('赵鼎', '吕颐浩', '同党', 70, '务实派·后皆相'),
    R('张浚', '李纲', '同道', 75, '皆主战·张浚少壮锐进'),
    // 主战 → 武将
    R('宗泽', '岳飞', '提携', 95, '宗泽招岳飞入义军·识其才'),
    R('李纲', '韩世忠', '识荐', 70, '李纲识韩世忠武勇·荐为御营前军'),
    // 武将之间
    R('韩世忠', '梁红玉', '夫妻', 95, '梁红玉为韩妻·后黄天荡擂鼓助战'),
    R('张俊', '韩世忠', '同列', 60, '皆御营大将·渐成竞争'),
    R('吴玠', '吴璘', '兄弟', 95, '川陕双吴·共守川蜀'),
    R('曲端', '吴玠', '同列', -30, '皆西军·曲端跋扈·吴玠忍'),
    // 帝室
    R('赵构', '李纲', '罢相', -10, '即位之初倚李纲·黄汪谗罢之·尚感念'),
    R('赵构', '黄潜善', '宠用', 75, '即位以来倚黄汪·南幸主张'),
    R('赵构', '宗泽', '存而不用', 30, '允其守汴梁·然不还都'),
    R('赵构', '孟皇后', '尊礼', 85, '孟氏为兄嫂·南渡尊礼'),
    R('孟皇后', '赵旉', '抚育', 80, '孟氏抚育皇子'),
    // 北狩
    R('赵桓', '赵构', '兄弟', 60, '兄弟·钦宗北狩·赵构南续宋祚'),
    R('赵佶', '赵构', '父子', 70, '父子·徽宗北狩·南宋名分父子'),
    // 内奸·准外戚
    R('秦桧', '黄潜善', '附议', 40, '秦桧此时尚未显·后投主和'),
    R('刘豫', '黄潜善', '附议', 30, '刘豫尚未叛宋·1130 才立伪齐')
  ];
  return extras;
}

// ── 4·openingLetters·开局信封 ──
function buildOpeningLetters() {
  return [
    {
      id: rid('letter'),
      from: '李纲',
      to: '陛下',
      title: '罢相还乡前遗表',
      content: '臣纲谨拜上言陛下·\n\n  靖康播迁·二圣北狩·黎民颠沛·宗社几倾。陛下抚军应天·南续宋祚·此天与陛下之机也。\n\n  臣以草茅·叨陪辅弼·苦心整顿·北防初立·宗泽守汴梁·张所联河朔义军·渐有可为。然黄潜善·汪伯彦谗臣专擅·言臣激金启衅。陛下不能察·罢臣相印。\n\n  臣去无所恨·所恨者·主战之议从此绝于朝堂·北伐之机将永失于江南。万乞陛下重拾恢复之志·勿听偏安之谋·留宗泽于汴·调诸路勤王·则中兴可期。\n\n  臣老矣·还乡待罪·二圣未还·夜不能寐。伏惟陛下察焉。\n\n建炎元年八月  纲再拜',
      tone: 'urgent',
      historicalContext: '李纲于建炎元年六月拜相·八月即遭黄汪谗罢。罢相前留表力主抗金恢复。',
      _source: 'opening'
    },
    {
      id: rid('letter'),
      from: '宗泽',
      to: '陛下',
      title: '东京留守泣血上疏',
      content: '老臣泽顿首再拜·\n\n  汴梁旧京·宗庙所在·二圣发迹之地。臣以衰朽·守此孤城·城外金兵未远·城内军食将匮。\n\n  伏念陛下虽南渡草创·然汴梁不可弃·两河义军不可解·北方士民不可遽弃。臣冒死请陛下还都汴梁·或暂幸襄阳·决不可深入江南。一入江南·则中原士民失望·北方义军离散·二圣回銮之机永绝。\n\n  臣不胜涕泣·屏息以俟·望阙再拜·惟陛下察焉。\n\n建炎元年八月  泽再拜',
      tone: 'urgent',
      historicalContext: '宗泽留守汴梁·屡上奏请赵构还都·终未得允。次年 (1128) 卒于任·临终三呼"过河"。',
      _source: 'opening'
    }
  ];
}

// ── 5·overview / background / openingText 扩 ──
function buildOverview() {
  return '建炎元年八月——北宋灭亡之第八月·南宋开国之第四月。\n\n靖康二年 (1127) 春·完颜宗翰·完颜宗望率金兵第二次南下·汴梁陷。徽宗 (赵佶)·钦宗 (赵桓) 及宗室皇族·后妃宫眷·三省六部百官·内侍工匠艺人数万·尽被掳北行·史称"靖康之耻"。北宋一百六十七年国祚就此终结。\n\n同年五月·康王赵构于应天府 (今河南商丘) 即位·孟太后下诏正名·改元建炎·年号取"建立炎汉"之意·宋祚南续·是为南宋。年仅二十岁的新天子·面对的是：宗庙陷于北·父兄囚于敌·汴梁孤城犹守·江南草创未稳·北方义军星散·金兵随时再来。\n\n建炎元年八月·初次任相的李纲·因力主收复中原·重整河防·调宗泽留守汴梁·遭主和派黄潜善 / 汪伯彦谗陷·罢相回原籍。主战派核心遭挫·主和派把持中枢·正欲怂恿赵构南幸扬州避祸。然汴梁宗泽连上三疏·泣血请还都；河北王善·丁进部·太行王彦·八字军·李彦仙等抗金义军星散坚持·川陕西军曲端跋扈·御营嫡系张俊·韩世忠尚未完成整编。北狩二宗音信几断·徽钦二宗已被押至燕京·后会再北徙至五国城。\n\n陛下作为南宋新立之天子·将面对·是听主和之议安守江南偏安一隅·还是听主战之策北伐中原迎回二圣？是允诸将自重坐大·还是早整军经武收回兵权？是稳固南渡新基·还是冒险还都汴梁？这一切·都在建炎元年八月这一刻·悬而未决。一个十九岁皇帝的每一步·都将决定大宋接下去 152 年的命运。';
}

function buildBackground() {
  return '北宋自神宗 (1067-1085) 王安石变法以降·新旧党争连绵六十余载·士林分裂·政事屡变。徽宗 (1100-1126) 即位·宠用蔡京·童贯·王黼·梁师成·李彦·朱勔等佞臣·朝政腐败·内忧外患。崇宁年间方腊起义于浙·宣和年间宋江起义于山东·靖康前夕民变四起。\n\n外交上·徽宗朝行"联金灭辽"之策·宣和二年 (1120) 与金签海上之盟·共击辽国。宣和七年 (1125) 金灭辽·宋未如约·金即转兵南下。靖康元年 (1126) 春·金兵第一次围汴梁·李纲守城·宋人坚壁·金兵索岁币粮饷退兵。然徽宗禅位钦宗 (赵桓)·朝廷依旧主和派当道·罢李纲·杀种师道·裁兵勤王。\n\n靖康元年闰十一月·金兵卷土重来·汴梁再围。守将杀降兵·城防松弛·闰十一月二十五日汴梁陷。次年 (1127) 正月·徽钦二宗被废为庶人。三月·金人立张邦昌为伪楚帝·四月·徽钦二宗及大量宫眷被押北行。康王赵构时为河北兵马大元帅·因奉命使金中途遁回·后又在相州得到孟太后 (北宋哲宗废后·当时居于汴梁但未被掳) 的诏书支持·南下应天府。\n\n建炎元年 (1127) 五月初一·赵构在应天府即位·改元建炎·是为南宋第一任皇帝宋高宗。即位之初·任李纲为相·李纲三月之内整顿河防·调宗泽守汴梁·组织反攻。然黄潜善 / 汪伯彦持禁中·屡进谗言·建炎元年八月·李纲被罢·主战派核心倒下。\n\n本剧本始于建炎元年八月·即李纲罢相之月·赵构在位之第四月。南宋一切·正在选择岔路。';
}

function buildOpeningText() {
  return '建炎元年 (1127) 八月十六日辰时·应天府紫宸殿。\n\n秋风萧瑟·宫殿尚陋。陛下御极方逾百日·龙袍犹半新半旧·应天府偏殿临时改作朝堂·宫女太监皆是新选·北方旧人皆陷于汴。窗外秋阳照穿薄雾·汴京方向遥遥北望·尘霾蔽天·似有金兵蹄声似无。\n\n殿外·黄潜善 / 汪伯彦相视一笑·他们昨日刚成功罢黜李纲——这位主战派核心·主张迁都襄阳整军反攻的老臣·终遭打压。今日他们要劝陛下下诏南幸扬州·彻底远离金人锋芒。\n\n殿内·宗泽东京留守的第三疏刚送达·字字泣血·请陛下还都汴梁。宗泽以六十九岁衰朽之身·孤守汴梁孤城三月·上奏屡屡石沉大海。御史台同时呈上风闻——御营前军张俊与中军韩世忠争功·几乎拔刀；西军曲端在永兴军路 (今陕西关中)·拥兵不调·已不接御营节制；川蜀路远·秋粮未及解送·东南漕路因战事时断时通；流民百万南下江南·应天府米价已涨三倍·临安路上有饿殍倒毙。\n\n太监高声宣旨·百官鱼贯入殿·黄潜善持笏前·欲奏南幸事；翰林学士在末·欲传宗泽奏疏；殿外·梁红玉之子小驾·因父韩世忠忙于操练·随母进宫问安。\n\n这是开局。陛下，请定夺。';
}

function applyPatch(sc, dryRun, force) {
  let changed = [];

  // 1. chaoyi
  if (!sc.chaoyi || force) {
    sc.chaoyi = buildChaoyi();
    changed.push('chaoyi (' + Object.keys(sc.chaoyi).length + ' fields)');
  }

  // 2. variables·绍宋已用 {base:[7], other:[12]} schema·共 19·跟天启 21 接近
  //    schema 与天启 flat array 不同·但内容覆盖度足够·**不扩**·避免 schema 混乱

  // 3. relations·补 char-char 关键
  const existing = sc.relations || [];
  // 标识·from|to|type 唯一
  const relKey = r => (r.from || '') + '|' + (r.to || '') + '|' + (r.type || '');
  const existingKeys = new Set(existing.map(relKey));
  const newRels = buildExtraRelations(existing).filter(r => !existingKeys.has(relKey(r)));
  if (newRels.length) {
    if (!Array.isArray(sc.relations)) sc.relations = [];
    sc.relations = sc.relations.concat(newRels);
    changed.push('relations +' + newRels.length + ' (total ' + sc.relations.length + ')');
  }

  // 4. openingLetters
  if (!Array.isArray(sc.openingLetters) || sc.openingLetters.length === 0 || force) {
    sc.openingLetters = buildOpeningLetters();
    changed.push('openingLetters (' + sc.openingLetters.length + ' 封)');
  }

  // 5. 长文本·overview / background / openingText
  if (!sc.overview || sc.overview.length < 400 || force) {
    sc.overview = buildOverview();
    changed.push('overview (' + sc.overview.length + ' chars)');
  }
  if (!sc.background || sc.background.length < 400 || force) {
    sc.background = buildBackground();
    changed.push('background (' + sc.background.length + ' chars)');
  }
  if (!sc.openingText || sc.openingText.length < 400 || force) {
    sc.openingText = buildOpeningText();
    changed.push('openingText (' + sc.openingText.length + ' chars)');
  }

  return changed;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  const sc = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8'));

  console.log('===== before =====');
  console.log('  chaoyi:', sc.chaoyi ? 'present' : 'ABSENT');
  console.log('  variables:', (sc.variables || []).length);
  console.log('  relations:', (sc.relations || []).length);
  console.log('  openingLetters:', (sc.openingLetters || []).length);
  console.log('  overview:', (sc.overview || '').length, 'chars');
  console.log('  background:', (sc.background || '').length, 'chars');
  console.log('  openingText:', (sc.openingText || '').length, 'chars');

  const changes = applyPatch(sc, dryRun, force);

  console.log('\n===== changes =====');
  if (changes.length === 0) console.log('  (nothing changed)');
  changes.forEach(c => console.log('  +', c));

  console.log('\n===== after =====');
  console.log('  chaoyi:', sc.chaoyi ? 'present' : 'ABSENT');
  console.log('  variables:', (sc.variables || []).length);
  console.log('  relations:', (sc.relations || []).length);
  console.log('  openingLetters:', (sc.openingLetters || []).length);
  console.log('  overview:', (sc.overview || '').length, 'chars');
  console.log('  background:', (sc.background || '').length, 'chars');
  console.log('  openingText:', (sc.openingText || '').length, 'chars');

  if (dryRun || changes.length === 0) {
    console.log('\n--dry-run·未写。');
    return;
  }

  // 备份
  const bakDir = path.join(path.dirname(SCENARIO_PATH), '_archived-backups');
  fs.mkdirSync(bakDir, { recursive: true });
  const bakPath = path.join(bakDir, path.basename(SCENARIO_PATH) + '.pre-shaosong-deeper-' + stamp() + '.bak');
  if (!fs.existsSync(bakPath)) fs.copyFileSync(SCENARIO_PATH, bakPath);
  console.log('\n备份·' + bakPath);

  fs.writeFileSync(SCENARIO_PATH, JSON.stringify(sc, null, 2) + '\n', 'utf8');
  console.log('写入完成。');
}

main();
