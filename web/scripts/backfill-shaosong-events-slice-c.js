#!/usr/bin/env node
// scripts/backfill-shaosong-events-slice-c.js
// 2026-05-21·Slice C·绍宋 events 0 → 33
//
// 分类·
//   historical  8 — 已发生背景 (海上之盟·靖康之难·赵构即位·李纲拜相 等)
//   opening     5 — 开局即发 (李纲罢相·南幸议·宗泽三疏·太学上书 等)
//   conditional 15 — 全部条件触发·玩家可影响 (苗刘兵变·黄天荡·钟相杨幺·岳飞从军 等)
//   random      3 — 概率事件 (北方流民·主战联名·御营兵变)
//   chain       2 — 连锁 (苗刘叛乱链·汴梁陷链)
//
// 注·玩家势力事件 (宋朝廷) 全部走 var-trigger·非强制必然 (per memory feedback_no_mystic_penalties)
//     历史事件 NPC 侧 (金军南下·伪齐立国) 走时间锚 + var 修正·留玩家干预空间

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
function rid() { return 'evt_' + Math.random().toString(36).slice(2, 12); }

function ev(name, opts) {
  return Object.assign({
    id: rid(),
    sid: SID,
    name,
    type: 'conditional',
    category: 'conditional',
    importance: '普通',
    trigger: '',
    effect: '',
    description: '',
    linkedChars: [],
    linkedFactions: [],
    triggered: false
  }, opts);
}

const EVENTS = [
  // ═══════════════════════════════════════════════════════════════════
  // historical 8 — 已发生 (background context·不再触发·仅供 AI prompt 参考)
  // ═══════════════════════════════════════════════════════════════════
  ev('海上之盟·联金灭辽(1120)', {
    type: 'historical', category: 'historical', importance: '关键',
    trigger: '已发生·剧本开局七年前',
    effect: '为后续金兵南下埋祸根·北宋战略反噬',
    description: '宣和二年 (1120)·北宋遣赵良嗣等渡海赴金·与完颜阿骨打盟约共击辽国·宋取燕云·金取辽东。然宋军屡败·燕京最终由金人攻克转交。盟后金人窥宋之虚实·两次南下灭宋之心由此种下。',
    linkedFactions: ['宋朝廷', '金国（大金）']
  }),
  ev('金灭辽(1125)', {
    type: 'historical', category: 'historical', importance: '关键',
    trigger: '已发生·剧本开局二年前',
    effect: '辽亡·宋失最大北方屏障·金兵直面北宋',
    description: '宣和七年 (1125) 二月·完颜娄室擒辽天祚帝·辽亡。八月·金即以宋未如约共击为辞·下诏南侵·宋金战争自此爆发。',
    linkedFactions: ['金国（大金）']
  }),
  ev('第一次开封围(1126.01)', {
    type: 'historical', category: 'historical', importance: '关键',
    trigger: '已发生·剧本开局一年半前',
    effect: '李纲守城退金·徽宗禅位钦宗·宋人主战主和分裂',
    description: '靖康元年 (1126) 正月·完颜宗望率东路军围汴梁。徽宗禅位钦宗赵桓·李纲拜相·誓守京师。金人索岁币粮饷退兵·然钦宗即罢李纲·种师道·主和派把持朝政。',
    linkedChars: ['赵桓', '赵佶', '李纲'],
    linkedFactions: ['宋朝廷', '金国（大金）']
  }),
  ev('靖康之难(1126.闰11 ~ 1127.04)', {
    type: 'historical', category: 'historical', importance: '关键',
    trigger: '已发生·剧本开局九月前',
    effect: '北宋亡·二圣北狩·宗室宫眷数万被掳·宗庙倾覆',
    description: '靖康元年闰十一月·金兵第二次南下·汴梁陷。次年 (1127) 三月·徽钦二宗被废为庶人。四月·完颜宗翰·宗望押解徽钦二宗·后妃·宗室·百官·工匠数万北行·史称"靖康之耻"。北宋一百六十七年国祚就此终结。',
    linkedChars: ['赵桓', '赵佶', '完颜宗翰', '完颜宗辅'],
    linkedFactions: ['宋朝廷', '金国（大金）']
  }),
  ev('张邦昌伪楚(1127.03-04)', {
    type: 'historical', category: 'historical', importance: '重要',
    trigger: '已发生·剧本开局四月前',
    effect: '金人强立伪楚·一月即让位赵构·张邦昌降封同安郡王',
    description: '靖康二年 (1127) 三月·金人立张邦昌为伪楚帝·都汴梁。然张邦昌素无大志·四月康王赵构即位·张邦昌让位归宋·封同安郡王。开局时张邦昌仍在朝任高位·然主和派之臭名渐显。',
    linkedChars: ['张邦昌', '赵构'],
    linkedFactions: ['宋朝廷']
  }),
  ev('赵构应天府即位(1127.05)', {
    type: 'historical', category: 'historical', importance: '关键',
    trigger: '已发生·开局起点',
    effect: '南宋肇基·改元建炎·宋祚南续',
    description: '建炎元年 (1127) 五月初一·康王赵构在应天府 (今河南商丘) 即位·孟太后下诏正名。改元建炎·取"建立炎汉"之义。是为南宋第一任皇帝宋高宗·时年二十岁。',
    linkedChars: ['赵构', '孟皇后'],
    linkedFactions: ['宋朝廷']
  }),
  ev('李纲拜相(1127.06)', {
    type: 'historical', category: 'historical', importance: '重要',
    trigger: '已发生·开局二月前',
    effect: '主战派首次掌权·调宗泽守汴梁·三月内整顿河防',
    description: '建炎元年六月·李纲拜相·主战。三月之内整顿河防·调宗泽守汴梁·组织反攻。然黄潜善 / 汪伯彦持禁中·屡进谗言。',
    linkedChars: ['李纲', '赵构', '黄潜善', '汪伯彦'],
    linkedFactions: ['宋朝廷']
  }),
  ev('宗泽守汴梁(1127.06-)', {
    type: 'historical', category: 'historical', importance: '重要',
    trigger: '已发生·仍在进行',
    effect: '汴梁孤悬·宗泽以六十九高龄守京师·屡上奏请还都',
    description: '建炎元年六月·李纲调老臣宗泽为东京留守·六十九岁宗泽孤守汴梁。开局时宗泽守汴已三月·连上数疏请陛下还都·然主和派持禁中·奏疏多石沉大海。',
    linkedChars: ['宗泽'],
    linkedFactions: ['宋朝廷']
  }),

  // ═══════════════════════════════════════════════════════════════════
  // opening 5 — 开局即发 (T1 / T2 必现·建炎元年八月这一刻的政治格局)
  // ═══════════════════════════════════════════════════════════════════
  ev('李纲罢相(1127.08·开局起点)', {
    type: 'story', category: 'story', importance: '关键',
    trigger: '开局即发·第 1 回合必现',
    effect: '主战派核心倒·主和派把持中枢·宋廷战略东向 (南幸)',
    description: '建炎元年八月十五日·黄潜善 / 汪伯彦联名上奏·指李纲"专擅·激金启衅·欲挟天子还汴梁"。陛下犹豫·终下诏罢李纲为观文殿大学士·还乡待罪。主战派核心首席倒下·朝廷战略由"复汴"转向"南幸"。',
    linkedChars: ['李纲', '赵构', '黄潜善', '汪伯彦'],
    linkedFactions: ['宋朝廷']
  }),
  ev('南幸扬州之议(1127.08)', {
    type: 'story', category: 'story', importance: '关键',
    trigger: '开局即发·第 1 回合必现',
    effect: '黄潜善 / 汪伯彦正在起草南幸诏书·宋廷重大战略抉择',
    description: '李纲罢相后·黄潜善 / 汪伯彦立即起草请陛下南幸扬州的奏疏·欲彻底远离金兵威胁。然汴梁宗泽连上奏请还都·朝堂分裂。',
    linkedChars: ['黄潜善', '汪伯彦', '宗泽', '赵构'],
    linkedFactions: ['宋朝廷']
  }),
  ev('宗泽东京三疏(1127.08)', {
    type: 'story', category: 'story', importance: '关键',
    trigger: '开局即发·第 1 回合必现',
    effect: '宗泽以衰朽之身泣血请还都·朝堂主战主和分裂彻底',
    description: '建炎元年八月·宗泽以东京留守身份连上三疏请陛下还都汴梁或暂幸襄阳·不可深入江南。字字泣血。然主和派把持中枢·奏疏多石沉大海。',
    linkedChars: ['宗泽', '赵构'],
    linkedFactions: ['宋朝廷']
  }),
  ev('陈东欧阳澈上书(1127.08)', {
    type: 'conditional', category: 'conditional', importance: '关键',
    trigger: '开局即发·第 1 回合必现 且 言路通塞 < 60',
    effect: '清议涌起·若不护则触发"陈东被斩"·若护则主战派士气 +30',
    description: '太学领袖陈东与布衣士子欧阳澈联名上书·力斥黄潜善 / 汪伯彦·力请留李纲 / 迎二圣。陛下抉择·是怒斩二人以儆主战激进·还是听之以收士心？',
    linkedChars: ['陈东', '欧阳澈', '赵构'],
    linkedFactions: ['宋朝廷']
  }),
  ev('御营张韩争功(1127.08)', {
    type: 'conditional', category: 'conditional', importance: '重要',
    trigger: '开局即发·第 1 回合必现 且 御营纪律 < 50',
    effect: '若不调和·御营纪律继续 -10·苗刘伏笔压力 +10',
    description: '御营前军张俊与中军韩世忠争功·几乎拔刀。御史台上风闻·请陛下早决。是分驻两地以避锋芒·还是合并整编以收军权？',
    linkedChars: ['张俊', '韩世忠'],
    linkedFactions: ['宋朝廷']
  }),

  // ═══════════════════════════════════════════════════════════════════
  // conditional 15 — 玩家可影响·var-trigger·非强制必然
  // ═══════════════════════════════════════════════════════════════════
  ev('陈东欧阳澈被斩', {
    type: 'conditional', category: 'conditional', importance: '关键',
    trigger: '主和派权势 > 70 且 言路通塞 < 30 (玩家放任主和派 + 杀谏即触发)',
    effect: '士林观感 -100·主战派士气 -30·清议为之痛恸·南宋初年最大政治污点',
    description: '陈东 / 欧阳澈被斩于应天府市。陛下闻闻而后悔莫及。绍兴元年追赠秘阁修撰·然清议永不释怀。此案在 1127.08 历史中确曾发生·然本剧本可由玩家护持二人避免。',
    linkedChars: ['陈东', '欧阳澈', '黄潜善', '汪伯彦', '赵构'],
    linkedFactions: ['宋朝廷']
  }),
  ev('苗刘兵变', {
    type: 'conditional', category: 'conditional', importance: '关键',
    trigger: '御营纪律 < 30 且 宦祸指数 > 60 且 turn > 12 (历史 1129.03)',
    effect: '苗傅刘正彦废赵构·扶赵旉摄政·张俊韩世忠勤王·一月即平·宦官康履被斩',
    description: '御营都统苗傅 / 副将刘正彦因不满宦官康履骄横·杀王渊与康履·废陛下尊号·立太子赵旉摄政。张俊 / 韩世忠由江南率兵勤王·一月即平。陛下复辟·苗刘逃·后被擒斩。然此变动摇南宋根基·赵旉因惊吓早夭。',
    linkedChars: ['苗傅', '刘正彦', '康履', '王渊', '张俊', '韩世忠', '赵旉', '赵构'],
    linkedFactions: ['宋朝廷']
  }),
  ev('完颜兀术南追·赵构泛海', {
    type: 'conditional', category: 'conditional', importance: '关键',
    trigger: '主和派权势 > 65 且 御营战力 < 40 且 turn > 18 (历史 1129.10)',
    effect: '兀术追至江南·陛下泛海避难·朝廷四散·法统危·然北退后即归',
    description: '建炎三年 (1129) 十月·完颜兀术大举南下追击赵构·一路追至明州 / 越州。陛下与宫眷泛海避难·朝廷四散。次年初兀术因不耐南方湿热北归·陛下方还。然南宋法统几乎崩溃。',
    linkedChars: ['完颜宗弼', '赵构', '韩世忠'],
    linkedFactions: ['宋朝廷', '金国（大金）']
  }),
  ev('黄天荡之战', {
    type: 'conditional', category: 'conditional', importance: '关键',
    trigger: '韩世忠在 且 兀术南追 已触发 且 主战派权势 > 40',
    effect: '韩世忠 8000 困兀术 10 万于黄天荡 48 日·南宋首次大胜·主战派权势 +20',
    description: '建炎四年 (1130) 春·完颜兀术北归·韩世忠以 8000 水军在镇江黄天荡 (今南京附近) 围困兀术 10 万军 48 日。梁红玉擂鼓助战。最终兀术凿河遁去·然南宋首次在战场击败金主力·军心大振·主战派复兴。',
    linkedChars: ['韩世忠', '梁红玉', '完颜宗弼'],
    linkedFactions: ['宋朝廷', '金国（大金）']
  }),
  ev('和尚原之战', {
    type: 'conditional', category: 'conditional', importance: '关键',
    trigger: '吴玠在 且 西军独立性 < 75 且 turn > 36 (历史 1131.10)',
    effect: '吴玠以三万守凤翔和尚原·大破金军十万·川蜀北门洞开之危解·吴玠声望 +30',
    description: '绍兴元年 (1131) 十月·完颜兀术 / 完颜没立率十万金军攻凤翔和尚原·吴玠以三万宋军凭险固守·诱敌深入·大破金军。此战为南宋开国以来对金大胜·川蜀北门洞开之危至此解。吴玠从此名震天下·西军实力大增。',
    linkedChars: ['吴玠', '吴璘', '完颜宗弼'],
    linkedFactions: ['西军（关陕）', '金国（大金）']
  }),
  ev('富平之战', {
    type: 'conditional', category: 'conditional', importance: '关键',
    trigger: '张浚为帅 且 西军独立性 > 60 且 turn > 30 (历史 1130.09)',
    effect: '张浚率西军五路总攻陕西·宋败·西军主力损·吴玠退守川蜀·西军独立性 +30',
    description: '建炎四年 (1130) 九月·川陕宣抚使张浚不顾众将反对·率五路西军共二十万 (吴玠 / 曲端 / 孙渥 / 刘锡 / 赵哲) 在富平 (今陕西富平) 与金军决战。曲端激谏不从·军议不一·宋军败。曲端被冤杀·西军大损·吴玠收残部退守川蜀。然此后西军独自抗金成形。',
    linkedChars: ['张浚', '吴玠', '吴璘', '曲端', '完颜宗辅', '完颜银术可'],
    linkedFactions: ['西军（关陕）', '宋朝廷', '金国（大金）']
  }),
  ev('钟相杨幺起义', {
    type: 'conditional', category: 'conditional', importance: '重要',
    trigger: '流民南渡数 > 70 且 江南瘟疫指数 > 50 且 turn > 18',
    effect: '荆湖洞庭起义·钟相主"等贵贱·均贫富"·南宋内乱·岳飞征讨',
    description: '建炎四年 (1130) 二月·荆湖鼎州龙阳人钟相起义·主张"等贵贱·均贫富"。钟相旋死·杨幺继·据洞庭。绍兴五年 (1135) 岳飞征讨·破之。此为南宋初年最大民变。',
    linkedChars: ['岳飞'],
    linkedFactions: ['宋朝廷']
  }),
  ev('宗泽病故', {
    type: 'conditional', category: 'conditional', importance: '关键',
    trigger: '宗泽在 且 turn > 11 (历史 1128.07)',
    effect: '汴梁陷之兆·主战派失第二支柱·宗泽临终三呼"过河"',
    description: '建炎二年 (1128) 七月·宗泽以衰朽守汴一年·屡奏不报·愤极·背疽发·临终三呼"过河"而卒。继任杜充弃汴梁南窜·汴梁陷。',
    linkedChars: ['宗泽', '杜充'],
    linkedFactions: ['宋朝廷']
  }),
  ev('岳飞从军', {
    type: 'conditional', category: 'conditional', importance: '关键',
    trigger: '宗泽在 且 主战派权势 > 30 且 turn > 4',
    effect: '宗泽招岳飞为统制·岳飞渐露头角·后南宋最大军事英雄',
    description: '建炎元年至二年间·宗泽招岳飞入义军·识其才。岳飞在宗泽帐下渐露头角·屡建战功。后绍兴年间为南宋抗金最重要将领。',
    linkedChars: ['宗泽', '岳飞'],
    linkedFactions: ['宋朝廷']
  }),
  ev('刘豫立伪齐', {
    type: 'conditional', category: 'conditional', importance: '关键',
    trigger: '主和派权势 > 60 且 turn > 36 (历史 1130.09 金人立)',
    effect: '金人扶刘豫为伪齐帝·都开封·成宋金缓冲·然宋失中原法统更甚',
    description: '建炎四年 (1130) 九月·金人扶济南知府刘豫为大齐皇帝·都北京 (北宋东京汴梁)·辖河南山东。是为伪齐。伪齐为宋金缓冲·然亦使宋丢失北方士民。绍兴七年 (1137) 金废刘豫。',
    linkedChars: ['刘豫', '完颜宗辅'],
    linkedFactions: ['金国（大金）']
  }),
  ev('张邦昌赐死', {
    type: 'conditional', category: 'conditional', importance: '重要',
    trigger: '主战派权势 > 50 或 言路通塞 > 60 (历史 1128 死)',
    effect: '前伪楚帝被赐死潭州·朝廷震慑·清议得伸·然亦激主和派',
    description: '建炎二年 (1128)·御史中丞颜歧言张邦昌伪楚之罪·复有谓邦昌与宫人有染·陛下下诏赐死于潭州。张邦昌之死为南宋初年清议得伸之标志·然黄潜善 / 汪伯彦因唇亡而惊。',
    linkedChars: ['张邦昌', '颜岐'],
    linkedFactions: ['宋朝廷']
  }),
  ev('王彦八字军南归', {
    type: 'conditional', category: 'conditional', importance: '重要',
    trigger: '北方义军规模 > 50 且 河北义军倾附度 > 50',
    effect: '王彦率八字军余部南归归朝·御营战力 +15·然抗金前线益空',
    description: '建炎二三年间·王彦率太行八字军 (面刺"赤心报国誓杀金贼") 余部南归归朝·成宋廷御营嫡系一支。然北方义军骨干南撤·中原抗金前线更加空虚。',
    linkedChars: ['王彦'],
    linkedFactions: ['太行八字军', '宋朝廷']
  }),
  ev('翟兴守河南', {
    type: 'conditional', category: 'conditional', importance: '重要',
    trigger: '宗泽在 且 turn > 6',
    effect: '宗泽奏拜翟兴为京西北路安抚制置使·河南义军获正名',
    description: '宗泽在汴梁招翟兴 / 翟进守河南伊阳。建炎中翟氏父子兄弟据河南诸州抗金多年·为宋廷在中原最后一支组织化武装。后翟兴为部下所杀·翟琮继之。',
    linkedChars: ['翟兴', '翟进', '翟琮', '宗泽'],
    linkedFactions: ['太行八字军', '宋朝廷']
  }),
  ev('江南瘟疫大发', {
    type: 'conditional', category: 'conditional', importance: '重要',
    trigger: '江南瘟疫指数 > 70 或 (流民南渡数 > 85 且 turn > 12)',
    effect: '江浙瘟疫蔓延·民心 -10·流民南渡数 -20·朝廷不得不调拨救济',
    description: '北人南渡日以万计·难民聚集江浙·尸横遍野·疫病爆发。临安 / 平江 / 嘉兴等府疫情严重·官民俱伤。朝廷调度药材救济·然力有不逮。',
    linkedFactions: ['宋朝廷']
  }),
  ev('西夏遣使通好', {
    type: 'conditional', category: 'conditional', importance: '普通',
    trigger: '与金和议状态 > 20 且 turn > 18',
    effect: '西夏遣使欲探宋金动向·若交好则西军后方稍安',
    description: '建炎初·西夏李乾顺继续观察宋金动静·偶遣使宋廷探虚实。陛下接见·或可疏通陕西后方·使西军可专心抗金。',
    linkedFactions: ['宋朝廷']
  }),

  // ═══════════════════════════════════════════════════════════════════
  // random 3 — 概率事件·体现日常的不确定性
  // ═══════════════════════════════════════════════════════════════════
  ev('北方流民南奔', {
    type: 'random', category: 'random', importance: '普通',
    trigger: '每月·概率 8%·若 流民南渡数 < 90',
    effect: '流民南渡数 +5·物价腾涌 +3·官民赈济压力增',
    description: '北方士民南奔·应天府 / 临安 / 镇江各路日有难民万计。米价飞涨·官府开仓救济·然多有饿殍。',
    linkedFactions: ['宋朝廷']
  }),
  ev('主战派联名上书', {
    type: 'random', category: 'random', importance: '重要',
    trigger: '每月·概率 5%·若 主战派权势 < 40 且 言路通塞 > 30',
    effect: '联名上奏·主战派士气 +10·主和派权势 -5·党争烈度 +5',
    description: '主战派文官 (赵鼎 / 张浚 / 胡寅等) 联名上书·斥主和误国·请还都迎二圣。陛下批阅·或留中·或行下·均为重大政治信号。',
    linkedFactions: ['宋朝廷']
  }),
  ev('御营兵变 (小规模)', {
    type: 'random', category: 'random', importance: '重要',
    trigger: '每年·概率 6%·若 御营纪律 < 35 且 财政恢复指数 < 30',
    effect: '兵变·军队哗变风险 +15·若处置不当则苗刘伏笔压力 +20',
    description: '御营某部因欠饷哗变·百余兵相聚劫库。陛下应抚或斩？以剿之·则伤军心；以抚之·则财政益困。',
    linkedFactions: ['宋朝廷']
  }),

  // ═══════════════════════════════════════════════════════════════════
  // chain 2 — 连锁
  // ═══════════════════════════════════════════════════════════════════
  ev('苗刘叛乱→平叛→宗室震动', {
    type: 'chain', category: 'chain', importance: '关键',
    trigger: '苗刘兵变 已触发',
    effect: '链触发·张俊韩世忠勤王 → 平叛 → 苗刘斩 → 赵旉因惊吓早夭 → 后宫风波',
    description: '苗刘兵变后·张俊 / 韩世忠由江南率兵勤王·一月即平。苗刘被擒于浦城·斩。然太子赵旉因惊吓夭折 (1129.07)·后宫风波·朱凤英失宠·韦渊借机进言。',
    linkedChars: ['苗傅', '刘正彦', '张俊', '韩世忠', '赵旉', '赵构', '朱凤英'],
    linkedFactions: ['宋朝廷']
  }),
  ev('宗泽病故→杜充弃汴→汴梁陷', {
    type: 'chain', category: 'chain', importance: '关键',
    trigger: '宗泽病故 已触发',
    effect: '链触发·杜充继任 → 杜充不堪 → 弃汴梁南窜 → 汴梁陷 → 北宋故都终丧',
    description: '宗泽卒后·杜充继任东京留守。杜充懦弱·不能服众·弃汴梁南窜任建康留守。建炎三年 (1129) 冬·金兵兵不血刃入汴梁。北宋故都自此终陷·名义上由伪齐 (1130 立) 据之。',
    linkedChars: ['宗泽', '杜充', '完颜宗辅'],
    linkedFactions: ['宋朝廷', '金国（大金）']
  })
];

function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');

  const sc = JSON.parse(fs.readFileSync(SCENARIO_PATH, 'utf8'));
  const existing = Array.isArray(sc.events) ? sc.events : [];

  console.log('===== 绍宋 Slice C events =====');
  console.log('existing:', existing.length);
  console.log('candidate:', EVENTS.length);

  // 按 type 分组报告
  const byType = {};
  EVENTS.forEach(e => {
    byType[e.type] = (byType[e.type] || 0) + 1;
  });
  console.log('by type:', byType);

  // 仅按 name 去重 (避免重跑)
  const existingNames = new Set(existing.map(e => e.name));
  const toAdd = EVENTS.filter(e => !existingNames.has(e.name));
  console.log('to add:', toAdd.length, '(skipped existing:', EVENTS.length - toAdd.length, ')');

  if (dryRun) {
    console.log('\nevent titles:');
    toAdd.forEach((e, i) => console.log('  ' + (i + 1).toString().padStart(2) + '. [' + e.type + '/' + e.importance + '] ' + e.name));
    console.log('\n--dry-run·未写。');
    return;
  }

  const bakDir = path.join(path.dirname(SCENARIO_PATH), '_archived-backups');
  fs.mkdirSync(bakDir, { recursive: true });
  const bakPath = path.join(bakDir, path.basename(SCENARIO_PATH) + '.pre-shaosong-events-slice-c-' + stamp() + '.bak');
  if (!fs.existsSync(bakPath)) fs.copyFileSync(SCENARIO_PATH, bakPath);
  console.log('\n备份·' + bakPath);

  sc.events = existing.concat(toAdd);
  fs.writeFileSync(SCENARIO_PATH, JSON.stringify(sc, null, 2) + '\n', 'utf8');
  console.log('写入·' + existing.length + ' → ' + sc.events.length);
}

main();
