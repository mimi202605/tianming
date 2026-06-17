#!/usr/bin/env node
// scripts/backfill-shaosong-player-parity.js
// 2026-05-21·补绍宋·宋朝廷 (player faction) 14 → 39 字段·跟 7 个 NPC 势力 38-42 keys 对齐
//
// 历史背景·建炎元年八月 (1127.09)·
//   赵构刚即位 (1127.05)·都应天府·尚未迁扬州 (1127.10)
//   靖康之耻刚发生 (1127.01)·北宋灭·徽钦二宗在金人手中·北方失陷
//   李纲刚被罢相 (1127.08)·黄潜善 / 汪伯彦 主和派当权
//   东南税赋未及收齐·汴梁府库尽失·财政捉襟
//
// 备份至 _archived-backups·走统一 backfill 脚本规范
//
// 用法·node web/scripts/backfill-shaosong-player-parity.js
//   --dry-run·只打印差异不写
//   --force·已 backfill 过仍重写

'use strict';

const fs = require('fs');
const path = require('path');

const SCENARIO_PATH = path.resolve(__dirname, '..', '..', 'scenarios', '绍宋·建炎元年八月（官方）.json');
const PLAYER_FAC_NAME = '宋朝廷';

function stamp() {
  const d = new Date();
  return d.getUTCFullYear().toString() +
    String(d.getUTCMonth() + 1).padStart(2, '0') +
    String(d.getUTCDate()).padStart(2, '0') + '-' +
    String(d.getUTCHours()).padStart(2, '0') +
    String(d.getUTCMinutes()).padStart(2, '0') +
    String(d.getUTCSeconds()).padStart(2, '0');
}

// 25 字段·建炎元年八月历史 grounded
function buildPlayerPatch(player, allFacs) {
  const otherFacNames = allFacs.filter(f => f.name !== PLAYER_FAC_NAME).map(f => f.name);
  // 跟其他 6 个势力的初始关系
  const relations = {};
  const RELATION_DEFAULT = {
    '金国（大金）': -100,        // 死敌·靖康之仇·北狩二圣
    '河北义军': 60,              // 抗金民间武装·朝廷感念但鞭长莫及
    '西军（关陕）': 40,          // 名义勤王·实则曲端跋扈渐失控
    '御营': 80,                  // 赵构嫡系·张俊韩世忠等领
    '太行八字军': 50,            // 王彦部·北方坚持抗金·朝廷褒奖
    '契丹反金 (耶律余睹部)': 30  // 潜在牵制金人之力·朝廷尚试联络
  };
  otherFacNames.forEach(n => { relations[n] = (n in RELATION_DEFAULT) ? RELATION_DEFAULT[n] : 0; });

  return {
    // 标识
    sid: 'fac_song',
    capital: '应天府',
    cultureLevel: 80,        // 北宋文教鼎盛·南渡犹存
    strength: 35,            // 北方尽失·东南半残·川蜀勉守
    courtInfluence: 70,      // 朝廷名分犹在
    popularInfluence: 65,    // 民心思宋·但战乱中

    // 战略 / 意识
    ideology: '尊王攘夷·程朱理学·二圣未还·正朔在我',
    longTermStrategy: '南渡草创·中兴大宋·收复中原·迎回二圣 (rhetoric)·偏安东南·联夏制金 (reality)',
    primaryTarget: '收复中原·迎回二圣',

    // 胜负条件
    victoryConditions: [
      '收复汴京·迎回二圣',
      '消灭金国主力',
      '十年内财政恢复·人口回稳',
      '党争平息·三派合流'
    ],
    defeatConditions: [
      '金军南下渡江·临都陷落',
      '宗室篡位·赵构被废',
      '主要藩镇 (西军/御营) 同时叛宋自立',
      '财政崩溃·东南税赋断绝'
    ],

    // 经济 / 财政
    economicPolicy: { labor: '租庸调·东南方田均税·西部军屯' },
    mainResources: ['江南漕粮', '川蜀盐铁', '茶马互市', '海贸番舶'],
    treasury: { money: 0, grain: 0, cloth: 0, note: '汴梁府库尽失·东南未及收·目前赖地方藩镇上供' },

    // 人口
    population: {
      actual: 0,
      registered: 0,
      hidden: 0,
      ethnicities: { 汉: 95, 番夷: 5 },
      note: '北宋鼎盛时 ~1 亿丁口·靖康之后北方失陷·南渡可纳 ~4000-5000 万'
    },

    // 民间舆论
    publicOpinion: {
      amongScholars: 55,    // 主战 vs 主和·士大夫分裂
      amongPeasantry: 70,   // 痛恨金人·心向南宋
      amongMerchants: 50,   // 战乱伤商但漕海未绝
      amongRefugees: 80     // 北人南渡·感念赵构延宋祚
    },

    // 内部·派系 / 紧张
    partyRelations: {
      '主战': { strength: 35, mood: '激愤', leader: '李纲·宗泽·张所' },
      '务实': { strength: 30, mood: '观望', leader: '吕好问·朱胜非·吕颐浩' },
      '主和': { strength: 35, mood: '当权', leader: '黄潜善·汪伯彦' }
    },
    internalTension: '主战派 (李纲宗泽) 与主和派 (黄潜善汪伯彦) 激烈·主战刚遭打压·宗泽守汴梁孤悬·军中将领骄横渐成藩镇之势',

    // 领导班子
    leadership: {
      ruler: '赵构',
      regent: '',
      general: '宗泽·李纲·韩世忠 (主战) / 张俊 (御营) / 吴玠吴璘 (西军应援)',
      chancellor: '李纲 (已罢) → 黄潜善 / 汪伯彦',
      spy: ''
    },

    // 态度细节
    attitudeDetail: {
      self: ['正朔所在', '中兴可期', '南渡草创·法理脆弱'],
      allies: ['河北义军赤胆抗金', '御营嫡系可恃', '西军勤王名义未失'],
      enemies: ['金人虎狼·必欲灭宋', '伪楚刘豫等北方降臣可恨'],
      neutrals: ['契丹反金可联·然路远难及', '党项夏国坐观']
    },

    // 历史事件·建炎元年八月之前的近期大事
    history: [
      { year: 1126, month: 12, event: '靖康之难·汴京陷·徽钦二宗及宗室宫眷尽被掳北行' },
      { year: 1127, month: 5,  event: '康王赵构于应天府即位·改元建炎·宋祚南续' },
      { year: 1127, month: 6,  event: '李纲拜相·主战·整顿河防·调宗泽守汴梁' },
      { year: 1127, month: 7,  event: '宗泽以东京留守独守汴梁·屡上奏请赵构还都' },
      { year: 1127, month: 8,  event: '李纲为黄潜善·汪伯彦所谗·罢相·主战派失势' }
    ],

    // 战争状态·正与金对峙
    warState: {
      active: [{ enemy: '金国（大金）', since: '1126.12', front: '河北 / 河东 / 京畿' }],
      pending: [],
      recent: [
        { event: '靖康之难·汴京陷', year: 1126, month: 12 },
        { event: '宗泽守汴梁', year: 1127, month: 6 }
      ]
    },

    // 技术水平
    techLevel: {
      overall: 75,         // 北宋技术鼎盛·活字印刷·指南针·火药·南渡保留
      military: 55,        // 北宋禁军已溃·新军未编·火器有限
      agriculture: 70,     // 江南占城稻·两年三熟·熟田丰
      crafts: 80,          // 瓷器·丝织·造船·南宋后世仍领先
      navigation: 70       // 海贸 + 漕运·指南针已用
    },

    // 触怒 / 报复阈值
    offendThresholds: [
      { score: 15, description: '轻微触怒·言辞冷淡', consequences: ['relations -5'] },
      { score: 30, description: '严重触怒·撤回使节', consequences: ['relations -15', '召回使节'] },
      { score: 60, description: '不可忍·宣战或绝交', consequences: ['relations -40', '宣战'] }
    ],

    // 特性 tags
    traits: [
      'imperial-court',          // 正朔朝廷
      'refugee-government',      // 南渡草创
      'civil-bureaucracy-heavy', // 重文轻武
      'faction-divided',         // 党争分裂
      'fiscal-strained',         // 财政紧张
      'morale-shaken'            // 士气受挫
    ]
  };
}

function applyPatch(player, patch, force) {
  let changed = 0;
  Object.keys(patch).forEach(k => {
    if (player[k] !== undefined && !force) return;  // 已有·不覆盖
    player[k] = patch[k];
    changed++;
  });
  return changed;
}

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const force = args.includes('--force');

  if (!fs.existsSync(SCENARIO_PATH)) {
    console.error('剧本不存在·', SCENARIO_PATH);
    process.exit(1);
  }

  const sc = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8'));
  const facs = sc.factions || [];
  const player = facs.find(f => f.name === PLAYER_FAC_NAME);
  if (!player) {
    console.error('未找到 player faction·', PLAYER_FAC_NAME);
    process.exit(1);
  }

  const before = Object.keys(player).length;
  const patch = buildPlayerPatch(player, facs);
  const patchKeys = Object.keys(patch);
  const willAdd = patchKeys.filter(k => player[k] === undefined);
  const willOverwrite = patchKeys.filter(k => player[k] !== undefined);

  console.log('剧本·', path.basename(SCENARIO_PATH));
  console.log('player·' + PLAYER_FAC_NAME + ' (' + before + ' keys)');
  console.log('patch·' + patchKeys.length + ' fields');
  console.log('  新增·' + willAdd.length + ' 个 (' + willAdd.join(', ') + ')');
  if (willOverwrite.length) {
    console.log('  已有 (force=' + force + ')·' + willOverwrite.length + ' 个 (' + willOverwrite.join(', ') + ')');
  }

  if (dryRun) {
    console.log('\n--dry-run·未写入。');
    return;
  }

  // 备份·走 _archived-backups·与其他 backfill 脚本一致
  const bakDir = path.join(path.dirname(SCENARIO_PATH), '_archived-backups');
  fs.mkdirSync(bakDir, { recursive: true });
  const bakPath = path.join(bakDir, path.basename(SCENARIO_PATH) + '.pre-shaosong-player-parity-' + stamp() + '.bak');
  if (!fs.existsSync(bakPath)) fs.copyFileSync(SCENARIO_PATH, bakPath);
  console.log('备份·' + bakPath);

  const changed = applyPatch(player, patch, force);
  const after = Object.keys(player).length;

  fs.writeFileSync(SCENARIO_PATH, JSON.stringify(sc, null, 2) + '\n', 'utf8');
  console.log('\n写入完成·' + before + ' → ' + after + ' keys·新增 ' + changed + ' 字段');
}

main();
