// shaosong-parity-data.js — 绍宋(建炎元年八月·1127)按天启官方标准补全的数据块。
// 各 slice 逐步填充;build-shaosong-parity.js 引入并注入 4 制品。内容为南宋建炎元年史实。
'use strict';

// ════ SLICE 1:government(二府三司制·宋官制描述对象·对标天启 5 键)════
const government = {
  name: '大宋',
  description: '《宋史·职官志》。宋承唐制而损益，以“分权制衡、重文抑武”为纲。\n' +
    '中枢“二府”对掌文武：中书门下(政事堂)为宰相理政之所，长官同中书门下平章事(宰相)、参知政事(副相)；枢密院掌军政机要、调发兵符，与中书对持，号“东西二府”。理财本有“三司”(盐铁/度支/户部)，元丰改制后归户部；建炎草创，财权多并于户部、随行在转运。\n' +
    '三省六部：尚书省统六部(吏/户/礼/兵/刑/工)，门下省掌封驳，中书省掌制诰；元丰后渐复三省之名。\n' +
    '台谏：御史台(御史中丞统侍御史/殿中/监察)纠劾百官，谏院(左右谏议大夫/司谏/正言)规谏君上、封还词头，台谏合势，宰执亦惮之。\n' +
    '词臣：翰林学士院掌内制(诏命)，知制诰掌外制，为储相之选。\n' +
    '地方：路—府州军监—县三级。每路设安抚使(帅司·兵民)、转运使(漕司·财赋)、提点刑狱(宪司·刑狱)、提举常平(仓司·常平义仓)“四监司”分权监临。\n' +
    '建炎行在：靖康之后中枢草创，置御营司总宿卫兼出征兵柄，东京留守司(宗泽)守汴联络两河，河北招抚司、河东经制司经画北疆义军，关陕委宣抚处置使节制西军。内侍以入内内侍省、内侍省二省供奉，权不复元丰前之炽。',
  selectionSystem: '宋代取士，号称“与士大夫治天下”，以科举为正途而最重之：\n' +
    '① 科举(正途)——解试(州)/省试(礼部)/殿试(天子亲策)三级。进士分五甲，一甲赐进士及第，径授京官、不数年至侍从。三年一开科(建炎南渡权宜或展期)。\n' +
    '② 恩荫(任子)——宰执、使相、待制以上遇郊祀/帝诞荫补子孙弟侄为斋郎、京官，员多而位卑，须经铨试、出官有阶。\n' +
    '③ 摄官/特奏名——久试不第者得“特奏名”出官；摄署试衔补外。\n' +
    '④ 胥吏出职——流外吏人考满可入流为低品。\n' +
    '⑤ 武举/武阶补授——武科取将才；将门子弟以武阶世补。\n' +
    '⑥ 军功补授——建炎兵兴，将士以战功补官、超转武阶最速，文武轻重之势为之一变。',
  promotionSystem: '宋代以“磨勘—举主—考课”相维，文官迁转尤密：\n' +
    '① 磨勘——文官三年、武官五年一磨勘，以“考第(功过)、举主、年劳”勘验迁阶，循资为常。\n' +
    '② 改官——选人(初等幕职州县官)须得举主五员奏荐，方得“改官”为京朝官，是仕途第一关，荐举连坐(被荐者赃私，举主同罚)。\n' +
    '③ 考课——州县“四善三最”，监司岁课守令而上之。\n' +
    '④ 台谏纠弹——侍从、监司、守臣黜陟，台谏得风闻言事，弹章一上可去位。\n' +
    '⑤ 堂除/特擢——宰执于政事堂“堂除”要阙，天子特简侍从、帅守，皆破格。\n' +
    '⑥ 封赠——得敕命者赠父，得诰命者上推三代。\n' +
    '建炎用人务急，宿将以军功超擢，宰执以堂除布置行在，资格之制为之少弛。',
  historicalReference: '【职官参考】\n' +
    '《宋史·职官志》卷一六一至一七〇 —— 二府三司、三省六部、台谏、监司、路府州县全覆盖。\n' +
    '《宋会要辑稿·职官》 —— 典制最详。\n' +
    '《续资治通鉴长编》(李焘) —— 北宋至靖康编年，制度沿革之本。\n' +
    '《建炎以来系年要录》(李心传) —— 高宗朝(建炎绍兴)编年，行在草创官制、用人之实录，本剧本之第一参据。\n' +
    '《文献通考·职官考》(马端临)、《容斋随笔》(洪迈) —— 制度考证。\n' +
    '【现行关键法典】《宋刑统》为刑名之本，《庆元条法事类》(后出)为编敕条法之汇，建炎仍沿元符、宣和敕令。'
};

// ════ SLICE 2:military(建炎元年八月军制与初始部队·对标天启 14 键)════
function troop(o) {
  return Object.assign({
    quality: '普通', morale: 50, training: 50, loyalty: 60, control: 60,
    ethnicity: '汉', equipmentCondition: '尚可', activity: ''
  }, o);
}
const military = {
  systemDesc: '宋行募兵制，兵分四等：禁军(天子之卫、出戍征战之主力)、厢军(诸州役作)、乡兵(土著团结)、蕃兵(沿边部族)。崇文抑武，兵权三分——枢密院掌发兵之符，三衙(殿前司/侍卫马军司/侍卫步军司)掌握兵之柄，率臣临时受命统兵出征，使“兵不知将、将不知兵”以防跋扈。靖康之后三衙禁军溃于汴京，建炎乃以御营司新总兵柄，西军、两河义军为实战之骨。',
  supplyDesc: '军食仰漕运与籴买，南渡后东南上供、江淮转般为命脉；行在草创，就粮、和籴、寄招并行，乏饷常致兵溃为盗。',
  battleDesc: '宋军长于守城、强弩、车营，短于野战骑兵；金军以铁骑(铁浮屠/拐子马)冲坚、骑射包抄见长。宋当以山河险隘、坚城弩阵相持，避平原决骑。',
  troops: ['禁军(御营·三衙残部)', '厢军', '乡兵·弓箭社', '蕃兵(沿边)', '两河忠义巡社(义军)', '水军(江防)', '西军(关陕劲旅)', '群盗招安军'],
  facilities: ['行在(南京应天府→扬州)', '东京留守司(汴梁)', '关陕诸隘(潼关·大散关)', '江防水寨', '军器所/都作院', '河防忠义寨'],
  organization: ['枢密院—发兵之符', '御营司—总宿卫兼出征', '三衙(殿步马)—握兵之柄', '诸路安抚司—帅司统兵', '都统制/统制/统领—军一级将领'],
  militarySystem: ['募兵制·刺字充军', '更戍/驻泊·将兵法(北宋遗制)', '枢密三衙分权', '率臣临遣·兵将分离', '忠义巡社·两河义军招抚', '武阶·军功超转'],
  campaigns: [
    '靖康之变·金人破汴掳二帝(靖康二年正月—四月)', '高宗即位南京·建炎纪元(建炎元年五月)', '宗泽守汴·联络两河义军', '黄潜善汪伯彦主和南迁',
    '李纲拜相旋罢(在位七十五日)', '关陕西军抗金(曲端·吴玠)', '太行八字军起(王彦)', '五马山寨拥信王(马扩·赵邦杰)',
    '金西路宗翰(粘罕)经略河东', '金东路宗望(斡离不)略河北', '建炎南渡·行在将徙扬州', '群盗蜂起(丁进·李成·孔彦舟)',
    '苗刘之变(将作·建炎三年)', '搜山检海(金人将追·建炎三年)'
  ],
  initialTroops: [
    // —— 御营司·行在禁军(建炎元年五月新置·总宿卫兼出征) ——
    troop({ name: '御营司·中军', armyType: '禁军', soldiers: 30000, garrison: '南京应天府(行在)', regionHint: '京东路（宋·义军前沿）', commander: '王渊', commanderTitle: '御营都统制', quality: '精锐', morale: 55, training: 60, loyalty: 65, control: 70, equipmentCondition: '尚可', activity: '扈卫行在·将徙扬州', composition: [{ type: '步兵(枪牌弩手)', count: 20000 }, { type: '骑兵', count: 6000 }, { type: '神臂弓·床弩', count: 4000 }] }),
    troop({ name: '御营前军', armyType: '禁军', soldiers: 12000, garrison: '行在', regionHint: '江南东路·建康府', commander: '韩世忠', commanderTitle: '御营左军统制(前军)', quality: '精锐', morale: 62, training: 65, loyalty: 70, control: 68, activity: '宿将·屡与金战', composition: [{ type: '步兵', count: 8000 }, { type: '背嵬骑兵', count: 2500 }, { type: '弩手', count: 1500 }] }),
    troop({ name: '御营右军', armyType: '禁军', soldiers: 11000, garrison: '行在', regionHint: '江南东路·建康府', commander: '张俊', commanderTitle: '御营右军统制', quality: '普通', morale: 55, training: 55, loyalty: 62, control: 64, composition: [{ type: '步兵', count: 8000 }, { type: '骑兵', count: 2000 }, { type: '弩手', count: 1000 }] }),
    troop({ name: '御营左军', armyType: '禁军', soldiers: 10000, garrison: '江淮', regionHint: '江南东路·建康府', commander: '刘光世', commanderTitle: '御营副使·左军', quality: '普通', morale: 45, training: 48, loyalty: 55, control: 50, activity: '兵骄将惰·避战', equipmentCondition: '尚可', composition: [{ type: '步兵', count: 8000 }, { type: '骑兵', count: 2000 }] }),
    // —— 东京留守司(宗泽·守汴联络两河) ——
    troop({ name: '东京留守司·正兵', armyType: '禁军', soldiers: 25000, garrison: '东京汴梁', regionHint: '京西北路·汴京（宗泽守）', commander: '宗泽', commanderTitle: '东京留守·开封尹', quality: '普通', morale: 68, training: 50, loyalty: 75, control: 60, activity: '坚守汴京·屡请北伐(疏二十四上)', composition: [{ type: '步兵', count: 18000 }, { type: '骑兵', count: 3000 }, { type: '弩手·床弩', count: 4000 }] }),
    troop({ name: '东京留守司·招抚义军', armyType: '义军', soldiers: 60000, garrison: '汴梁外·两河', regionHint: '京西北路·汴京（宗泽守）', commander: '王善·杨进等', commanderTitle: '受宗泽招抚之群豪', quality: '乌合', morale: 50, training: 20, loyalty: 45, control: 30, equipmentCondition: '简陋', activity: '号百万·实多盗寇·赖宗泽威望', composition: [{ type: '招安群盗·乡兵', count: 60000 }] }),
    // —— 太行八字军(王彦) ——
    troop({ name: '太行八字军', armyType: '义军', soldiers: 19000, garrison: '太行山·共城', regionHint: '河东路（金占·八字军抗）', commander: '王彦', commanderTitle: '河北招抚司前军统制', quality: '精锐', morale: 75, training: 45, loyalty: 80, control: 65, equipmentCondition: '简陋', activity: '面刺“赤心报国誓杀金贼”·据太行抗金', composition: [{ type: '山地步兵·弓弩', count: 17000 }, { type: '轻骑', count: 2000 }] }),
    // —— 河北/河东 忠义寨 ——
    troop({ name: '五马山寨·忠义军', armyType: '义军', soldiers: 15000, garrison: '河北·五马山', regionHint: '河北东路（金占）', commander: '马扩·赵邦杰', commanderTitle: '拥信王(赵榛)之寨', quality: '乌合', morale: 60, training: 25, loyalty: 65, control: 35, equipmentCondition: '简陋', activity: '河北忠义之望·孤悬敌后', composition: [{ type: '寨兵·乡勇', count: 15000 }] }),
    troop({ name: '河北招抚司·王彦后部', armyType: '义军', soldiers: 12000, garrison: '河北', regionHint: '河北东路（金占）', commander: '张所(招抚使)·余部', commanderTitle: '河北招抚司(寻罢)', quality: '乌合', morale: 48, training: 22, loyalty: 50, control: 30, equipmentCondition: '简陋', activity: '招抚司旋罢·部曲星散', composition: [{ type: '招集乡兵', count: 12000 }] }),
    // —— 关陕西军(宋军精锐之残) ——
    troop({ name: '泾原西军', armyType: '禁军', soldiers: 22000, garrison: '泾原·关陕', regionHint: '永兴军路·关陕（西军）', commander: '曲端', commanderTitle: '泾原路经略使', quality: '精锐', morale: 65, training: 68, loyalty: 60, control: 62, activity: '西军宿旅·骁悍善战·诸将不相下', composition: [{ type: '步兵(长枪强弩)', count: 15000 }, { type: '西军骑兵', count: 5000 }, { type: '神臂弓', count: 2000 }] }),
    troop({ name: '泾原吴玠部', armyType: '禁军', soldiers: 9000, garrison: '关陕', regionHint: '永兴军路·关陕（西军）', commander: '吴玠', commanderTitle: '泾原路统制', quality: '精锐', morale: 66, training: 70, loyalty: 70, control: 68, activity: '后保和尚原·仙人关之名将', composition: [{ type: '步兵', count: 6500 }, { type: '骑兵', count: 1500 }, { type: '弩手', count: 1000 }] }),
    troop({ name: '熙河·秦凤诸军', armyType: '禁军', soldiers: 14000, garrison: '熙河·秦凤', regionHint: '永兴军路·关陕（西军）', commander: '诸路帅臣', commanderTitle: '熙河/秦凤路兵', quality: '普通', morale: 55, training: 58, loyalty: 58, control: 55, composition: [{ type: '步兵', count: 10000 }, { type: '蕃汉骑兵', count: 4000 }] }),
    // —— 江防·东南 ——
    troop({ name: '江淮水军', armyType: '水军', soldiers: 8000, garrison: '大江·建康采石', regionHint: '江南东路·建康府', commander: '行在水军统制', commanderTitle: '江防水军', quality: '普通', morale: 52, training: 50, loyalty: 60, control: 58, activity: '凭江为险·防金骑南渡', composition: [{ type: '楼船·战棹水兵', count: 6000 }, { type: '弩手', count: 2000 }] }),
    troop({ name: '两浙·福建路屯驻', armyType: '厢军', soldiers: 11000, garrison: '两浙·福建', regionHint: '两浙路·临安府', commander: '诸州兵马', commanderTitle: '路分屯驻·厢禁混编', quality: '普通', morale: 50, training: 42, loyalty: 60, control: 55, composition: [{ type: '屯驻步兵', count: 9000 }, { type: '土兵·弓手', count: 2000 }] }),
    troop({ name: '荆湖·川峡屯驻', armyType: '厢军', soldiers: 13000, garrison: '荆湖·川峡', regionHint: '荆湖南北路', commander: '诸路兵马', commanderTitle: '路分屯驻', quality: '普通', morale: 50, training: 45, loyalty: 60, control: 55, composition: [{ type: '屯驻步兵', count: 10000 }, { type: '弩手·土丁', count: 3000 }] }),
    // —— 群盗(将招或将叛·乱源) ——
    troop({ name: '李成·孔彦舟等群盗', armyType: '群盗', soldiers: 40000, garrison: '京东·淮南', regionHint: '京东路（宋·义军前沿）', commander: '李成·孔彦舟·张用', commanderTitle: '蜂起之群豪(将招将叛)', quality: '乌合', morale: 45, training: 18, loyalty: 20, control: 15, ethnicity: '汉', equipmentCondition: '简陋', activity: '建炎兵乱·剽掠州县·招抚不常', composition: [{ type: '流民·溃兵·群盗', count: 40000 }] }),
    // —— 金军(对手·东西两路) ——
    troop({ name: '金西路军(粘罕)', armyType: '金·铁骑', soldiers: 70000, garrison: '云中·河东', regionHint: '河东路（金占·八字军抗）', commander: '完颜宗翰(粘罕)', commanderTitle: '金·左副元帅', quality: '精锐', morale: 75, training: 80, loyalty: 80, control: 82, ethnicity: '女真·汉签军', equipmentCondition: '精良', activity: '西路主帅·经略河东·谋取关陕', composition: [{ type: '女真铁骑(铁浮屠/拐子马)', count: 25000 }, { type: '签军步卒(汉·渤海·契丹)', count: 40000 }, { type: '炮手·攻城', count: 5000 }] }),
    troop({ name: '金东路军(斡离不)', armyType: '金·铁骑', soldiers: 60000, garrison: '燕京·河北', regionHint: '河北东路（金占）', commander: '完颜宗望(斡离不)', commanderTitle: '金·右副元帅', quality: '精锐', morale: 74, training: 78, loyalty: 80, control: 80, ethnicity: '女真·汉签军', equipmentCondition: '精良', activity: '东路主帅·略河北·窥京东', composition: [{ type: '女真铁骑', count: 22000 }, { type: '签军步卒', count: 33000 }, { type: '炮手·攻城', count: 5000 }] })
  ],
  armies: [],
  weaponArsenal: {
    '神臂弓': '宋军远射利器·三百步洞重札', '床子弩': '守城巨弩·可钉人于城', '麻扎刀/大斧': '斫马足以破金骑',
    '步人甲': '宋重步兵札甲·重五十余斤', '克敌弓/弩': '强弩劲矢', '猛火油柜': '水陆纵火', '霹雳炮/火球': '早期火器·烟焰惊敌',
    '铁蒺藜/拒马': '阻骑', '楼船·车船': '江防水战', '战棹·蒙冲': '轻捷水兵', '环首刀/朴刀': '近战', '长枪': '步阵拒骑',
    '旁牌/团牌': '步兵障蔽', '强弓': '骑射不及金·恃弩', '云梯/濠桥': '攻城', '塞门刀车': '守城巷战', '撒星阵·叠阵': '以弩制骑之阵法'
  },
  conscriptionSystem: {
    '募兵制': '刺字充军·终身为兵·世代相承(军班)',
    '招抚忠义': '招两河义军、群盗为忠义巡社·授官给据·收编以实军',
    '签军(金)': '金人于占区签发汉·渤海·契丹丁壮为步卒攻城·驱以当锋',
    '乡兵团结': '土著弓箭社、忠义社自卫·官给旗帜器械'
  },
  militaryPolicies: {
    '战守之议': '李纲主战守河北·黄潜善汪伯彦主和南迁·朝议两持',
    '招抚两河': '宗泽守汴·张所王彦经画河北河东·联络忠义敌后牵制',
    '经营关陕': '委宣抚处置使节制西军·以关陕为根本牵金西路',
    '将兵分合': '罢更戍·宿将各统其军·渐成大将拥兵之渐(韩张刘岳之先声)'
  },
  totalForces: {
    '宋·行在御营': 63000, '宋·东京留守司(含义军)': 85000, '宋·关陕西军': 45000,
    '宋·两河忠义/招抚': 46000, '宋·诸路屯驻水军': 32000,
    '金·东西两路(对手)': 130000, '群盗(将招将叛)': 40000
  }
};

// ════ SLICE 3:rules / timeline / mechanicsConfig(AI 推演规则 + 史脉 + 特殊机制)════
const rules = {
  base: '宋以"祖宗家法"为治本——与士大夫共治天下，重文抑武，台谏制衡宰执，事为之防、曲为之制，故无强藩巨阉之祸而有积弱之患。靖康丧乱，建炎草创，行在播迁，纲纪未立：务在收人心、抚忠义、固东南、徐图恢复。君上(高宗)初立，威望未孚，宰执黄潜善汪伯彦主和南迁，李纲宗泽主战守，朝议两持。',
  combat: '宋军长于守城、强弩(神臂弓三百步洞札)、车营叠阵、水战(江防)，短于平原骑战。金军恃女真铁骑(铁浮屠正面冲坚、拐子马两翼包抄)与骑射，且驱签军汉卒当攻城之锋。宋当凭山河险隘(关陕潼关大散关、江淮长江)、坚城弩阵以逸待劳，联络两河忠义(八字军/五马山)牵制敌后，避与金骑野战决胜；一旦平原浪战、或大将避战(刘光世)，则易溃。',
  economy: '国用仰东南财赋与漕运——南渡后江淮转般、上供、和籴为命脉。兵兴饷乏，滥发交子会子致钱轻物贵；乏食常致募兵溃散为盗(李成孔彦舟)。理财之要：节浮费、通市舶(泉州广州番舶之利)、抚流亡复农桑、慎和籴勿尽刮民。府库空虚而养兵日费，是建炎第一困局。',
  diplomacy: '宋金之间和战两难：主和者欲上表称臣、纳币割地以纾目前之祸(黄汪)，主战者欲连结两河、经营关陕以图恢复(李宗)。旁可羁縻西夏(乘金西顾)、结好高丽大理为声援，间用反间(招契丹反金之耶律余睹)。然金势方张，宗翰宗望东西并进，和不可恃、战未有备，唯收拾人心、积蓄根本为上。'
};
const timeline = {
  past: [
    { turn: -167, date: '建隆元年(960)', title: '陈桥兵变·赵匡胤代周建宋', note: '黄袍加身，定都汴梁，开大宋。', category: '开国', isHistorical: true },
    { turn: -166, date: '建隆二年(961)', title: '杯酒释兵权', note: '太祖收宿将兵柄，强干弱枝，重文抑武之始。', category: '制度', isHistorical: true },
    { turn: -123, date: '景德元年(1004)', title: '澶渊之盟', note: '与辽约为兄弟，岁输银绢。百年弭兵，亦启岁币之例。', category: '外交', isHistorical: true },
    { turn: -58, date: '熙宁二年(1069)', title: '王安石变法', note: '青苗免役保甲诸法。新旧党争自此数十年不息。', category: '变法', isHistorical: true },
    { turn: -7, date: '宣和二年(1120)', title: '海上之盟·宋金约攻辽', note: '约金夹攻辽、复燕云。引虎自卫之始。', category: '外交', isHistorical: true },
    { turn: -2, date: '宣和七年(1125)', title: '金灭辽·旋即败盟南下', note: '辽亡。金见宋虚弱，分东西两路南侵。', category: '战争', isHistorical: true },
    { turn: -1, date: '靖康元年(1126)', title: '金两围汴京·李纲守城', note: '第一次围城李纲拒守得纾，旋罢主和割三镇。冬，金再至。', category: '战争', isHistorical: true },
    { turn: 0, date: '靖康二年正月—四月(1127)', title: '靖康之变·二帝北狩', note: '金破汴京，掳徽钦二帝及宗室后妃北去，北宋亡。立张邦昌为"楚"。', category: '丧乱', isHistorical: true },
    { turn: 0, date: '建炎元年五月(1127)', title: '康王赵构即位南京·改元建炎', note: '于南京应天府(商丘)即帝位，是为高宗。张邦昌伪楚自废。南宋立。', category: '开国', isHistorical: true },
    { turn: 0, date: '建炎元年六月—八月(1127)', title: '李纲拜相旋罢·宗泽守汴', note: '李纲为相七十五日，主战守，为黄汪所倾去位。宗泽以东京留守守汴，招抚两河忠义，疏请回銮北伐。', category: '朝局', isHistorical: true }
  ],
  future: []
};
const mechanicsConfig = {
  enabled: true,
  specialMechanics: [
    { id: 'songJinWarPeace', name: '宋金和战博弈', description: '称臣纳币(主和)与连两河固关陕图恢复(主战)之抉择，影响民心、士气、金人南侵之缓急与朝臣党争。', relatedVars: ['民心', '士气', '金人威胁'] },
    { id: 'recruitLoyalists', name: '招抚忠义群盗', description: '招两河义军、群盗为忠义巡社：兵力骤增而控制力/粮饷压力俱升，处置失当则招而复叛(如李成孔彦舟)。', relatedVars: ['兵力', '粮饷', '控制力'] },
    { id: 'generalsAutonomy', name: '武将拥兵之渐', description: '罢更戍、宿将各统其军以御金：战力增而跋扈之险生，赏罚不公或忌刻宿将则酿兵变(苗刘之变之先声)。', relatedVars: ['军队战力', '武将忠诚', '皇威'] },
    { id: 'southernFiscalStrain', name: '财用南渡之困', description: '养兵日费而府库空虚，漕运和籴与滥发会子之间维系国用；刮民太甚则民溃为盗，纵兵乏饷则军溃。', relatedVars: ['国库', '民心', '军心'] },
    { id: 'xingzaiMigration', name: '行在播迁', description: '行在自南京应天府将徙扬州、终渡江南：近江海则安全，远中原则失北人之心、堕恢复之志。', relatedVars: ['朝廷安全', '民心', '恢复之志'] }
  ]
};

// ════ SLICE 4:cities(建炎元年要邑) / items(宋室重宝·兵器·典籍)════
function city(name, type, population, walls, note, region) {
  return { name: name, type: type, population: population, walls: walls, note: note, region: region || '' };
}
const cities = [
  city('应天府(南京)', '行在', 200000, '州城', '建炎元年高宗即位、行在所在(商丘)，旋将徙扬州。', '京东路（宋·义军前沿）'),
  city('扬州', '重镇', 400000, '州城·濒运河', '江淮枢纽，漕运咽喉，行在将徙于此。', '江南东路·建康府'),
  city('东京开封府(汴梁)', '故都', 600000, '重城·外城内城', '北宋故都，靖康残破，宗泽以东京留守司坚守、联络两河。', '京西北路·汴京（宗泽守）'),
  city('临安府(杭州)', '名邑', 500000, '州城·濒江', '两浙首府，东南繁盛，后为南宋行都。', '两浙路·临安府'),
  city('建康府(江宁)', '重镇', 300000, '石头城·据江', '六朝旧都，控扼大江，江防根本。', '江南东路·建康府'),
  city('平江府(苏州)', '名邑', 300000, '州城·水乡', '两浙财赋之渊，鱼米丝绸甲天下。', '两浙路·临安府'),
  city('越州(绍兴府)', '名邑', 250000, '州城', '会稽繁富，后高宗驻跸改绍兴。', '两浙路·临安府'),
  city('明州(庆元)', '港城', 150000, '州城·濒海', '东南市舶要港，海道之枢。', '两浙路·临安府'),
  city('江陵府(荆南)', '重镇', 200000, '州城·据江汉', '荆湖门户，控扼上游。', '荆湖南北路'),
  city('潭州(长沙)', '重镇', 180000, '州城', '荆湖南路要冲，湖湘财赋之地。', '荆湖南北路'),
  city('成都府', '名邑', 400000, '州城', '川峡首府，天府富庶，西南根本。', '川峡四路·成都府'),
  city('京兆府(长安)', '边镇', 150000, '故都残城', '关陕重镇，西军经略之所，控扼金西路。', '永兴军路·关陕（西军）'),
  city('福州', '港城', 200000, '州城·濒海', '福建首府，番舶之利。', '福建路'),
  city('广州', '港城', 200000, '州城·濒海', '岭南都会，市舶司所在，海外贸易第一大港。', '广南东路·香山'),
  city('鄂州(武昌)', '重镇', 160000, '州城·据江', '荆湖北路要冲，扼江汉之会。', '荆湖南北路')
];
function item(name, type, description, effect, rarity, owner, value, provenance, hiddenAbility) {
  return { name: name, type: type, description: description, effect: effect, rarity: rarity, owner: owner || '', value: value, quantity: 1, provenance: provenance || '', era: '宋', hiddenAbility: hiddenAbility || '', sid: 'sc-jianyan1-1127-shaosong', id: 'item_ss_' + name.replace(/[^a-zA-Z0-9一-龥]/g, '').slice(0, 8) };
}
const items = [
  item('大宋受命宝', 'seal', '南宋新铸传国宝玺。靖康北狩，旧玺多为金人掠去，高宗即位别铸受命之宝以承大统。', '皇帝最高权威之凭，诏命法理所系', '传说', '赵构', 1000000, '建炎元年新铸，以代北狩之旧玺', '无此玺则行在诏令失法统之据'),
  item('太祖誓碑·不杀士大夫', 'document', '太祖密镌誓碑藏太庙：不杀士大夫及上书言事人。靖康后传为祖训之symbol，南渡士心所恃。', '宽待士大夫·凝聚士心', '传说', '宗庙', 800000, '太祖朝密立，世世相戒', '违此祖训则台谏哗、士心离'),
  item('神臂弓图样', 'document', '神臂弓制法机要，宋军远射之利器，三百步可洞重札。制法为军国机密。', '装备神臂弓·克金骑', '史诗', '军器所', 300000, '熙宁中李定献其法', '法泄于金则失远射之长'),
  item('武经总要', 'document', '仁宗朝曾公亮丁度奉敕编兵书，集军制、器械、阵法、边防之大成。', '提升将帅韬略·阵法', '史诗', '枢密院', 200000, '庆历中奉敕编', ''),
  item('营造法式', 'document', '将作监李诫编，土木营造之圭臬，城防宫室之范。', '助城防营造', '稀有', '将作监', 120000, '崇宁二年颁行', ''),
  item('大晟钟·礼乐器', 'treasure', '徽宗朝大晟府所制雅乐钟磬，金人破汴掳之北去，礼乐散亡。', '复礼乐·彰正统', '传说', '(为金所掠)', 500000, '崇宁中铸', '礼器北失，正统之symbol受损'),
  item('宣和御府书画', 'treasure', '徽宗内府所藏历代法书名画，靖康后散失劫余，文脉所寄。', '彰文治·士林清望', '史诗', '(散失劫余)', 400000, '宣和御府旧藏', ''),
  item('交子会子钞版', 'token', '官交子会子印造之版。纸币之利在通货，滥发则钱轻物贵、为财困之源。', '发行会子·济军用(慎用)', '稀有', '行在', 100000, '南渡后益赖楮币', '滥发则物价腾踊、民怨沸'),
  item('神臂弓', 'weapon', '宋军制式强弩，蹶张三百步，洞重札。守城野战制金骑之利器。', '远射·克骑', '史诗', '诸军', 50000, '神宗朝定制', ''),
  item('步人甲', 'armor', '宋重步兵札甲，重五十余斤，凡千八百余叶，步阵拒骑之坚。', '重步兵防御', '稀有', '诸军', 30000, '绍兴军制定其制', ''),
  item('麻扎刀·大斧', 'weapon', '宋军斫马之器，专破金人铁骑马足(后岳家军郾城用之)。', '破铁骑·斫马足', '稀有', '诸军', 20000, '宋军制式', ''),
  item('龙泉宝剑', 'weapon', '处州龙泉所铸名剑，锋利无双，将帅佩用。', '将帅佩剑·励士', '稀有', '将帅', 40000, '龙泉剑炉所铸', ''),
  item('汝窑天青瓷', 'treasure', '汝州贡瓷，雨过天青，徽宗朝御用，世所罕珍。', '彰文雅·赐赏', '传说', '内府', 600000, '北宋汝官窑', ''),
  item('端溪砚', 'treasure', '端州名砚，文房之宝，士大夫所重。', '文房·清赏', '稀有', '士林', 15000, '端溪所出', ''),
  item('水运仪象台图', 'document', '苏颂韩公廉造水运仪象台之图法，天文计时之精器，本在汴京。', '助天文历法·彰格物', '史诗', '(在汴京·将失)', 250000, '元祐中苏颂造', '汴京若失则此器随之沦没')
];

// ════ SLICE 5:culturalWorks(宋世文华·替换空) / familiesAdd(宋室名门·按名追加)════
function work(title, author, year, type, desc, status) {
  return { title: title, author: author, year: year, type: type, desc: desc, status: status || '刊行' };
}
const culturalWorks = [
  work('《资治通鉴》', '司马光', 1084, '史学·编年', '上起战国下迄五代，编年体通史之极轨，鉴往以资治道。', '刊行'),
  work('《梦溪笔谈》', '沈括', 1091, '笔记·格物', '天文、历算、地理、物理、技术之记，中国科学史之瑰宝。', '刊行'),
  work('《清明上河图》', '张择端', 1120, '绘画·风俗', '汴京清明繁华长卷，靖康丧乱后益见承平之可念。', '存世'),
  work('《千里江山图》', '王希孟', 1113, '绘画·青绿山水', '十八岁少年所作青绿巨制，江山千里，气象恢宏。', '内府'),
  work('东坡词文', '苏轼', 1100, '词章·文章', '豪放词宗，文章百代，士林所宗。', '盛传'),
  work('漱玉词', '李清照', 1127, '词章·婉约', '易安居士之词，南渡之际家国身世之痛入于声律，"婉约之宗"。', '新出'),
  work('《太极图说》·二程理学', '周敦颐·程颢程颐', 1070, '理学·义理', '濂洛之学，言性理太极，为宋明理学之滥觞。', '渐盛'),
  work('《武经总要》', '曾公亮·丁度', 1044, '兵学·典制', '奉敕编纂之兵学大成，军制器械阵法边防毕载。', '刊行'),
  work('《营造法式》', '李诫', 1103, '工技·典制', '将作监颁土木营造之圭臬，制度图样俱备。', '颁行'),
  work('《宣和书谱·画谱》', '徽宗内府', 1120, '艺文·谱录', '御府所藏历代书画之录，靖康后多散佚，文脉所系。', '散佚劫余')
];
function family(name, tier, prestige, seat, founder, ancestors, head, members, desc) {
  return { name: name, tier: tier, prestige: prestige, ancestralSeat: seat, founder: founder, notableAncestors: ancestors, currentHead: head, members: members, desc: desc };
}
const familiesAdd = [
  family('赵氏·大宋皇室', 'imperial', 100, '河南开封府(汴京)·应天府', '赵匡胤(宋太祖·960 陈桥建宋)',
    ['赵匡胤(太祖)', '赵光义(太宗)', '赵恒(真宗·澶渊)', '赵顼(神宗·变法)', '赵佶(徽宗·北狩)', '赵桓(钦宗·北狩)'],
    '赵构(高宗)', ['赵构(高宗)', '赵佶(徽宗·北狩)', '赵桓(钦宗·北狩)', '赵榛(信王·陷于五马山)', '孟氏(隆祐太后)'],
    '靖康北狩，二帝及宗室大半陷金，康王构以孑遗即位南京，赵氏正统所寄于一人。'),
  family('种氏·西军将门', 'military', 78, '洛阳·关中', '种世衡(经略西边·"种家军"之祖)',
    ['种世衡', '种古', '种谔', '种师道(老种)', '种师中(小种)'], '(师道师中相继殁于靖康)',
    ['种师道(殁)', '种师中(殁)'], '关陕世将"种家军"，老种小种威震西陲，靖康勤王相继殁，西军失重望。'),
  family('折氏·府州世将', 'military', 72, '府州(河东)', '折从阮(五代以来世守府州)',
    ['折从阮', '折德扆', '折御卿', '折可适', '折可存'], '折彦质',
    ['折彦质', '折可求'], '府州折氏自五代世将河东边藩，控扼府麟，蕃汉所服；金势既炽，向背系河东之安危。'),
  family('吴氏·陇右将门', 'military', 70, '德顺军(陇右)', '吴玠吴璘兄弟',
    ['吴玠', '吴璘'], '吴玠', ['吴玠', '吴璘'], '陇右吴氏，玠璘兄弟起于行伍，后保和尚原仙人关，为南宋西陲长城。'),
  family('相州韩氏·相门', 'civil', 75, '相州安阳', '韩琦(三朝宰相·韩魏公)',
    ['韩琦(韩魏公)', '韩忠彦'], '(相州陷金)', ['韩肖胄'], '安阳韩氏，魏公韩琦为仁英神三朝名相，文献相门，士望所归。')
];

// ════ SLICE 6:深挖 人物/名门/部队(按 name 追加·幂等)════
const SID = 'sc-jianyan1-1127-shaosong';
function ch(name, o) {
  return Object.assign({
    name: name, alive: true, gender: '男', ethnicity: '汉', faction: '宋朝廷',
    loyalty: 60, ambition: 50, intelligence: 60, valor: 45, military: 45,
    administration: 55, charisma: 55, diplomacy: 50, benevolence: 50, integrity: 55,
    traits: [], isHistorical: true, sid: SID
  }, o);
}
const charactersAdd = [
  // —— 一致性补漏(已在 military/families/works 引用) ——
  ch('刘光世', { officialTitle: '御营副使·左军都统制', role: '武将', age: 39, party: '主和派', valor: 55, military: 58, loyalty: 50, ambition: 60, integrity: 35, family: '刘氏', stance: '中兴四将之一·然骄惰避战', location: '江淮', learning: '将门', personality: '怯战·拥兵自保', bio: '将门子，号"中兴四将"之一。然兵骄将惰、每战避敌、拥兵自重，为南宋诸将之尤难驾驭者。' }),
  ch('完颜宗望', { name: '完颜宗望', officialTitle: '金·右副元帅(斡离不)', role: '金军主帅', age: 40, faction: '金国（大金）', ethnicity: '女真', valor: 78, military: 82, intelligence: 70, loyalty: 80, ambition: 70, integrity: 50, family: '完颜氏', stance: '金东路主帅·略河北', location: '燕京', personality: '沉勇善将·号"二太子"', traits: ['valiant', 'ambitious'], bio: '金太祖第二子，号斡离不、"二太子"。东路军主帅，两入汴京，掳徽钦北去，略地河北，威震南朝。' }),
  ch('马扩', { officialTitle: '河北忠义五马山寨', role: '义军领袖', age: 41, valor: 60, military: 58, intelligence: 68, loyalty: 85, integrity: 75, stance: '河北忠义之望·孤悬敌后', location: '河北·五马山', personality: '忠勇有谋', traits: ['loyal', 'brave'], bio: '尝使金，谙虏情。靖康后聚河北忠义于五马山寨，拥信王赵榛，遥结宗泽，为敌后孤忠。' }),
  ch('赵榛', { name: '赵榛', officialTitle: '信王', role: '宗室', age: 20, isRoyal: true, royalRelation: '徽宗第十八子', loyalty: 80, intelligence: 55, family: '赵氏·大宋皇室', stance: '陷于河北·为五马山寨所拥', location: '河北·五马山', bio: '徽宗第十八子，北狩途中脱归(一说诈称)，为五马山忠义所拥，旋复陷没，河北忠义之所系。' }),
  ch('赵邦杰', { officialTitle: '五马山寨首领', role: '义军', age: 38, valor: 55, military: 50, loyalty: 80, integrity: 70, stance: '河北忠义寨主', location: '河北·五马山', bio: '河北土豪，与马扩共保五马山寨，拥信王抗金。' }),
  ch('李成', { officialTitle: '群盗(将叛投金)', role: '群盗', age: 35, faction: '群盗', loyalty: 20, valor: 62, military: 60, ambition: 75, integrity: 15, stance: '蜂起剽掠·招而复叛', location: '京东·淮南', personality: '骁悍反复', traits: ['treacherous', 'ambitious'], bio: '建炎兵乱蜂起之巨盗，众数万，剽掠州县。招抚不常，后叛投刘豫、金人，为南朝心腹之患。' }),
  ch('孔彦舟', { officialTitle: '群盗(后降金)', role: '群盗', age: 34, faction: '群盗', loyalty: 18, valor: 58, military: 52, ambition: 70, integrity: 12, stance: '剽掠·反复', location: '京东', personality: '残暴反复', traits: ['treacherous', 'cruel'], bio: '起于群盗，剽掠荆湖京东，凶残反复，后降金事伪齐。' }),
  ch('张用', { officialTitle: '群盗(自号"张莽荡")', role: '群盗', age: 33, faction: '群盗', loyalty: 25, valor: 55, military: 48, integrity: 25, stance: '蜂起·将招', location: '京西', bio: '建炎群盗之一，自号张莽荡，众十余万，后为岳飞所招。' }),
  ch('种师道', { officialTitle: '故·检校少傅·同知枢密院事', role: '名将(已殁)', alive: false, age: 76, valor: 70, military: 80, intelligence: 75, loyalty: 90, integrity: 80, family: '种氏·西军将门', stance: '西军宿望·"老种"·殁于靖康', location: '(已殁)', personality: '老成持重', traits: ['veteran', 'loyal'], bio: '关陕世将"种家军"之望，号"老种经略相公"。两护汴京，主战守，靖康元年忧愤而卒，西军失重镇。' }),
  ch('种师中', { officialTitle: '故·检校少保·步军都虞候', role: '名将(已殁)', alive: false, age: 68, valor: 72, military: 78, loyalty: 90, integrity: 80, family: '种氏·西军将门', stance: '"小种"·殁于靖康榆次', location: '(已殁)', traits: ['veteran', 'loyal'], bio: '种师道弟，号"小种"。靖康援太原，孤军力战，殁于榆次，西军精锐俱丧。' }),
  ch('折可求', { officialTitle: '麟府路兵马钤辖', role: '武将(将降金)', age: 44, valor: 58, military: 60, loyalty: 40, integrity: 35, family: '折氏·府州世将', stance: '府州世将·向背系河东', location: '府州', personality: '世将·观望', bio: '府州折氏世将，控麟府。金势既炽，孤悬河东，进退维谷，后竟降金。' }),
  ch('李清照', { name: '李清照', haoName: '易安居士', role: '词人', gender: '女', age: 44, faction: '宋朝廷', intelligence: 90, charisma: 80, administration: 40, valor: 10, integrity: 80, learning: '词章·金石', family: '李氏', stance: '"婉约之宗"·南渡飘零', location: '江南', personality: '才高情深·家国身世之痛', traits: ['talented', 'refined'], hobbies: ['词', '金石', '博古'], bio: '号易安居士，赵明诚妻。词冠一时，"婉约之宗"。靖康南渡，明诚旋卒，金石散亡，身世家国之痛尽入声律(《漱玉词》)。' }),
  // —— 建炎名臣 ——
  ch('王庶', { officialTitle: '陕西节制使·后枢密副使', role: '文臣', age: 49, intelligence: 70, administration: 72, military: 55, loyalty: 80, integrity: 75, party: '主战派', stance: '经略陕西·主战', location: '关陕', bio: '建炎经略陕西，节制西军，主战，与曲端不相能。后入枢府。' }),
  ch('范致虚', { officialTitle: '知邓州·京西北路安抚使', role: '文臣', age: 58, intelligence: 60, administration: 58, military: 35, loyalty: 75, integrity: 60, stance: '勤王·将兵无谋', location: '京西', bio: '靖康率陕西兵勤王，号百万而无纪律，败于邓州，书生将兵之戒。' }),
  ch('汪藻', { officialTitle: '中书舍人·掌内制', role: '词臣', age: 49, intelligence: 80, administration: 60, charisma: 75, integrity: 70, learning: '进士·词章', stance: '南渡制诰之手·"隆祐太后告天下手书"', location: '行在', personality: '典丽工文', traits: ['talented'], bio: '南渡词臣，制诰典丽。所草"隆祐太后告天下手书"传诵一时，词翰之冠。' }),
  ch('綦崇礼', { officialTitle: '翰林学士·知制诰', role: '词臣', age: 44, intelligence: 78, administration: 58, charisma: 70, integrity: 72, learning: '进士', stance: '掌内制·文翰之选', location: '行在', bio: '南渡翰林，掌内制，文章尔雅，为储相之选。' }),
  ch('叶梦得', { haoName: '石林居士', officialTitle: '江东安抚制置大使', role: '文臣', age: 50, intelligence: 75, administration: 70, military: 50, integrity: 68, learning: '进士·词章', stance: '帅守江东·能文能政', location: '建康', traits: ['talented'], bio: '号石林居士，博学工词。建炎帅守江东，经画江防，文政兼优。' }),
  ch('滕康', { officialTitle: '同知枢密院事', role: '执政', age: 52, intelligence: 65, administration: 68, loyalty: 75, integrity: 65, stance: '行在执政', location: '行在', bio: '建炎执政，与刘珏并护隆祐太后于江西。' }),
  ch('李回', { officialTitle: '御史中丞', role: '台谏', age: 47, intelligence: 68, administration: 60, integrity: 72, loyalty: 75, party: '主战派', stance: '台谏·主战', location: '行在', bio: '建炎御史中丞，纠弹不避权贵，主战守。' }),
  // —— 武将 ——
  ch('赵立', { officialTitle: '楚州知州·淮东', role: '武将(忠烈)', age: 39, valor: 80, military: 72, loyalty: 95, integrity: 88, stance: '死守楚州·忠烈', location: '楚州', personality: '骁勇刚烈', traits: ['valiant', 'loyal', 'steadfast'], bio: '行伍出身，身被多创犹力战。死守楚州御金，城陷死之，淮东之忠魂。' }),
  ch('邵青', { officialTitle: '水军统领', role: '武将', age: 36, valor: 60, military: 55, loyalty: 55, integrity: 45, stance: '江湖水军·亦盗亦兵', location: '江淮', bio: '起于群豪，长水战，往来江湖，时叛时附，后归官军。' }),
  ch('解元', { officialTitle: '韩世忠部将', role: '武将', age: 35, valor: 72, military: 60, loyalty: 80, integrity: 65, faction: '宋朝廷', stance: '韩家军骁将', location: '江淮', traits: ['valiant'], bio: '韩世忠麾下骁将，善守，号"铁脸"。' }),
  ch('呼延通', { officialTitle: '韩世忠部将', role: '武将', age: 33, valor: 78, military: 55, loyalty: 82, integrity: 60, faction: '宋朝廷', stance: '韩家军悍将·尝擒金将', location: '江淮', traits: ['valiant'], bio: '韩世忠麾下悍将，黄天荡之役尝搏擒金将，骁勇绝伦。' }),
  ch('巨师古', { officialTitle: '御营统制', role: '武将', age: 40, valor: 58, military: 55, loyalty: 65, integrity: 55, faction: '宋朝廷', location: '江淮', bio: '御营将领，从韩世忠张俊征讨群盗。' }),
  ch('董先', { officialTitle: '京西忠义将', role: '义军', age: 30, valor: 70, military: 55, loyalty: 70, integrity: 58, stance: '京西忠义·后归岳飞', location: '京西', traits: ['valiant'], bio: '京西忠义之将，骁勇，后隶岳飞军。' }),
  // —— 金方 ——
  ch('完颜宗磐', { officialTitle: '金·宗室大臣', role: '金贵', age: 38, faction: '金国（大金）', ethnicity: '女真', intelligence: 58, valor: 60, ambition: 80, loyalty: 60, integrity: 40, family: '完颜氏', stance: '金宗室·跋扈', location: '会宁', bio: '金太宗长子，宗室跋扈，后以谋反诛。' }),
  ch('完颜斜也', { officialTitle: '金·国论勃极烈(谙班)', role: '金贵', age: 50, faction: '金国（大金）', ethnicity: '女真', intelligence: 65, valor: 62, loyalty: 75, integrity: 55, family: '完颜氏', stance: '金储贰·勃极烈', location: '会宁', bio: '金太祖弟，谙班勃极烈(储贰)，金初枢机重臣。' }),
  ch('高庆裔', { officialTitle: '金·宗翰幕僚', role: '金臣(汉)', age: 45, faction: '金国（大金）', ethnicity: '渤海', intelligence: 75, administration: 70, loyalty: 70, integrity: 45, stance: '粘罕谋主·渤海人', location: '云中', traits: ['cunning'], bio: '渤海人，宗翰(粘罕)谋主，西路军机务多决于其手。' }),
  ch('时立爱', { officialTitle: '金·燕京留守', role: '金臣(汉)', age: 60, faction: '金国（大金）', ethnicity: '汉', intelligence: 65, administration: 72, loyalty: 65, integrity: 55, stance: '汉人世侯·治燕地', location: '燕京', bio: '燕地汉人世族，金用以抚治燕云汉民，签军调度多倚之。' }),
  ch('完颜活女', { officialTitle: '金·万户', role: '金将', age: 32, faction: '金国（大金）', ethnicity: '女真', valor: 75, military: 68, loyalty: 78, integrity: 50, family: '完颜氏', stance: '娄室之子·骁将', location: '河东', traits: ['valiant'], bio: '完颜娄室之子，从父经略陕西，骁勇善战。' }),
  // —— 周边君主 ——
  ch('李乾顺', { name: '李乾顺', officialTitle: '西夏·崇宗', role: '西夏君主', age: 44, faction: '西夏', ethnicity: '党项', intelligence: 72, administration: 70, valor: 55, ambition: 60, loyalty: 60, integrity: 55, stance: '西夏崇宗·乘金宋之衅取地', location: '兴庆府', personality: '崇汉文·伺机进取', traits: ['shrewd'], bio: '西夏崇宗，在位久，崇尚汉学。乘宋金鏖战，取宋西陲州军以广疆土。' }),
  ch('段正严', { name: '段正严', haoName: '段和誉', officialTitle: '大理·宪宗', role: '大理君主', age: 44, faction: '大理国', ethnicity: '白蛮', intelligence: 70, administration: 65, benevolence: 70, valor: 40, loyalty: 55, integrity: 65, stance: '大理君主·勤政好佛', location: '大理', personality: '好佛·勤政', traits: ['benevolent'], bio: '大理国君段正严(和誉)，在位四十年，勤政爱民，崇佛，后逊位为僧。即金庸笔下"段誉"所本。' }),
  ch('王楷', { name: '王楷', officialTitle: '高丽·仁宗', role: '高丽君主', age: 18, faction: '高丽', ethnicity: '高丽', intelligence: 60, administration: 55, valor: 35, loyalty: 50, integrity: 55, stance: '高丽仁宗·李资谦乱后', location: '开京', bio: '高丽仁宗，少年即位，权臣李资谦专政之乱方平，国势不振，于宋金之间持两端。' }),
  ch('李阳焕', { name: '李阳焕', officialTitle: '大越·仁宗', role: '大越君主', age: 11, faction: '大越·李朝', ethnicity: '京族', intelligence: 50, administration: 45, valor: 30, loyalty: 50, stance: '大越李朝幼主', location: '升龙', bio: '大越李朝仁宗，冲龄即位，太后辅政，南疆自守。' }),
  ch('耶律大石', { officialTitle: '辽·遗臣(西征建西辽)', role: '契丹雄主', age: 40, faction: '契丹反金 (耶律余睹部)', ethnicity: '契丹', intelligence: 82, administration: 75, valor: 78, military: 78, ambition: 80, loyalty: 70, integrity: 65, stance: '辽宗室·西走图复·将建西辽', location: '漠北·西域', personality: '雄略·百折不挠', traits: ['valiant', 'shrewd', 'ambitious'], bio: '辽宗室，进士出身而知兵。辽亡西走，收拾余众图复国，旋将建西辽(哈剌契丹)于中亚，雄据一方。' }),
  // —— 词臣·理学·文化 ——
  ch('吕本中', { haoName: '东莱先生', officialTitle: '中书舍人', role: '词臣·学者', age: 43, intelligence: 80, administration: 58, charisma: 68, integrity: 75, learning: '理学·诗', family: '吕氏', stance: '诗家·理学·宰相世家', location: '行在', traits: ['talented', 'upright'], bio: '宰相吕公著曾孙，江西诗派宗匠，理学名家，《童蒙训》传家学。' }),
  ch('尹焞', { haoName: '和靖先生', officialTitle: '崇政殿说书(徵)', role: '理学家', age: 56, intelligence: 78, administration: 40, valor: 10, integrity: 90, loyalty: 80, learning: '理学·程门', stance: '程颐高弟·讲学不仕', location: '蜀·后行在', personality: '笃实守节', traits: ['upright', 'steadfast'], bio: '程颐高弟，号和靖先生。靖康不污伪命，讲学传洛学正脉，朝廷屡徵。' }),
  ch('朱松', { haoName: '韦斋', officialTitle: '尚书吏部员外郎', role: '文臣·学者', age: 30, intelligence: 72, administration: 58, integrity: 80, loyalty: 78, party: '主战派', learning: '理学·诗', family: '朱氏', stance: '主战·不附和议(朱熹之父)', location: '行在·福建', traits: ['upright'], bio: '号韦斋，力主战守、不附和议而去位。其子朱熹后集理学之大成。' }),
  ch('邓肃', { officialTitle: '左正言', role: '台谏', age: 36, intelligence: 70, integrity: 82, loyalty: 80, valor: 30, party: '主战派', stance: '谏官·骨鲠', location: '行在', traits: ['upright', 'brave'], bio: '骨鲠谏臣，尝面折权幸，论事不避，主战守。' }),
  ch('富直柔', { officialTitle: '同知枢密院事', role: '执政', age: 45, intelligence: 65, administration: 66, loyalty: 70, integrity: 68, family: '富氏', stance: '名相富弼之后·执政', location: '行在', bio: '名相富弼之孙，建炎执政，世家清望。' }),
  ch('卫肤敏', { officialTitle: '试给事中', role: '文臣', age: 48, intelligence: 66, administration: 62, integrity: 70, loyalty: 75, stance: '使金·骨鲠', location: '行在', bio: '尝使金不辱命，给事中封驳有守。' }),
  ch('胡舜陟', { officialTitle: '御史', role: '台谏', age: 50, intelligence: 64, integrity: 68, loyalty: 72, stance: '言事·荐贤', location: '行在', bio: '建炎御史，屡上封事，荐宗泽岳飞诸将。' }),
  // —— 后妃宗室补 ——
  ch('柔福帝姬', { name: '柔福帝姬', role: '宗室', gender: '女', age: 18, isRoyal: true, royalRelation: '徽宗女', loyalty: 70, family: '赵氏·大宋皇室', stance: '北狩·后有真伪之疑', location: '(北狩)', bio: '徽宗女，靖康北狩。后有自南归者称柔福，真伪聚讼，南渡宫闱一疑案。' }),
  ch('吴氏', { name: '吴氏', role: '后妃', gender: '女', age: 13, isRoyal: true, royalRelation: '高宗才人(后为宪圣太后)', loyalty: 88, intelligence: 78, charisma: 72, integrity: 75, family: '吴氏', stance: '高宗潜邸·后为宪圣慈烈皇后', location: '行在', traits: ['shrewd', 'loyal'], bio: '高宗才人，颖慧知书，从帝于播迁，后立为后(宪圣)，历四朝、寿八十三，南宋后宫之柱石。' })
];

const familiesAdd2 = [
  family('吕氏·东莱相门', 'civil', 80, '寿州·京东', '吕蒙正(太宗朝相)', ['吕蒙正', '吕夷简', '吕公著', '吕好问', '吕本中'], '吕好问', ['吕好问', '吕本中'], '寿州吕氏，三世四相(蒙正夷简公著)，理学诗家相承，宰相世家之冠。'),
  family('富氏·相门', 'civil', 76, '河南洛阳', '富弼(仁宗朝名相)', ['富弼'], '富直柔', ['富直柔'], '洛阳富氏，富弼为仁宗名相、与范仲淹同道，世家清望。'),
  family('朱氏·婺源', 'civil', 60, '徽州婺源·福建', '朱松(韦斋)', ['朱松'], '朱松', ['朱松'], '婺源朱氏，南渡寓闽。朱松力主战守；其子朱熹后为理学之大成，开闽学。'),
  family('刘氏·将门', 'military', 68, '保安军(陕西)', '刘怀忠·刘延庆', ['刘延庆', '刘光世', '刘光国'], '刘光世', ['刘光世'], '陕西刘氏将门，延庆光世父子统兵，号中兴四将之一(然怯战)。'),
  family('杨氏·将门', 'military', 66, '代州(河东)', '杨业(杨家将之祖)', ['杨业', '杨延昭', '杨文广'], '杨沂中(存中)', ['杨沂中'], '代州杨氏"杨家将"世将，至杨沂中(存中)为高宗宿卫之将，恩宠冠诸将。'),
  family('折可求一系', 'military', 60, '府州', '(见折氏世将)', ['折可求'], '折可求', ['折可求'], '府州折氏麟府一支，可求统麟府兵，后降金，世将之变。'),
  family('完颜氏·金室', 'imperial', 95, '会宁府(上京)', '完颜阿骨打(金太祖)', ['完颜阿骨打(太祖)', '完颜吴乞买(太宗)', '完颜宗翰', '完颜宗望', '完颜宗弼'], '完颜吴乞买(太宗)', ['完颜吴乞买', '完颜宗翰', '完颜宗望', '完颜宗弼', '完颜希尹'], '女真完颜部，阿骨打起兵灭辽破宋，宗室诸王(粘罕斡离不兀术)统兵南下，方张之势。'),
  family('李氏·西夏王室', 'imperial', 78, '兴庆府', '李元昊(西夏开国)', ['李元昊', '李乾顺'], '李乾顺(崇宗)', ['李乾顺'], '党项拓跋李氏，元昊建夏，乾顺崇宗承之，乘宋金之隙以广河西。'),
  family('段氏·大理王室', 'imperial', 72, '大理', '段思平(大理开国)', ['段思平', '段正明', '段正严'], '段正严(宪宗)', ['段正严'], '白蛮段氏，世王大理，崇佛勤政，正严(和誉)在位最久，西南一方之主。'),
  family('范氏·苏州', 'civil', 74, '苏州吴县', '范仲淹(文正公)', ['范仲淹'], '(族裔散居)', [], '吴县范氏，文正公范仲淹"先忧后乐"为士林师表，义庄垂范，世家之楷。'),
  family('韦氏·后族', 'consort', 65, '开封', '(高宗生母韦贤妃之族)', ['韦渊'], '韦渊', ['韦渊'], '高宗生母韦贤妃(北狩)之族，以椒房贵，韦渊为外戚之首。'),
  family('邢氏·后族', 'consort', 62, '开封', '(高宗元配邢秉懿之族)', ['邢焕', '邢秉懿'], '邢焕', ['邢焕', '邢秉懿'], '高宗元配邢秉懿(北狩·遥立为后)之族，邢焕以国丈贵。'),
  family('张氏·将门(俊)', 'military', 64, '凤翔成纪', '张俊', ['张俊'], '张俊', ['张俊'], '成纪张氏，张俊起行伍为中兴四将，敛财封王，将门之富贵者。'),
  family('耶律氏·辽宗室', 'imperial', 70, '(辽亡·余裔)', '耶律阿保机(辽太祖)', ['耶律大石', '耶律余睹'], '耶律大石', ['耶律大石', '耶律余睹'], '契丹耶律皇族，辽亡后余睹反金、大石西走图复(将建西辽)，散而未绝。')
];

const troopsAdd = [
  // 御营·三衙补
  { name: '殿前司·残部', armyType: '禁军', soldiers: 8000, garrison: '行在', regionHint: '京东路（宋·义军前沿）', commander: '杨沂中', commanderTitle: '殿前司·宿卫', quality: '精锐', morale: 58, training: 60, loyalty: 72, control: 70, ethnicity: '汉', equipmentCondition: '尚可', activity: '扈从天子·宿卫', composition: [{ type: '殿前班直', count: 6000 }, { type: '亲从弩手', count: 2000 }], sid: 'sc-jianyan1-1127-shaosong' },
  { name: '御营·苗傅刘正彦部', armyType: '禁军', soldiers: 8000, garrison: '行在', regionHint: '两浙路·临安府', commander: '苗傅·刘正彦', commanderTitle: '御营将(将叛)', quality: '普通', morale: 48, training: 52, loyalty: 35, control: 45, ethnicity: '汉', equipmentCondition: '尚可', activity: '怨望王渊宦官·将作苗刘之变', composition: [{ type: '步兵', count: 6500 }, { type: '骑兵', count: 1500 }], sid: 'sc-jianyan1-1127-shaosong' },
  // 西军补
  { name: '熙河刘锜部', armyType: '禁军', soldiers: 8000, garrison: '关陕', regionHint: '永兴军路·关陕（西军）', commander: '刘锜', commanderTitle: '陇右都护·泾原经略', quality: '精锐', morale: 64, training: 70, loyalty: 75, control: 70, ethnicity: '汉', equipmentCondition: '尚可', activity: '西军名将·后顺昌大捷', composition: [{ type: '步兵(强弩)', count: 6000 }, { type: '骑兵', count: 2000 }], sid: 'sc-jianyan1-1127-shaosong' },
  { name: '泾原王庶节制兵', armyType: '禁军', soldiers: 10000, garrison: '关陕', regionHint: '永兴军路·关陕（西军）', commander: '王庶', commanderTitle: '陕西节制使', quality: '普通', morale: 52, training: 58, loyalty: 70, control: 55, ethnicity: '汉', equipmentCondition: '简陋', activity: '节制西军·诸将不相下', composition: [{ type: '步兵', count: 8000 }, { type: '蕃汉骑兵', count: 2000 }], sid: 'sc-jianyan1-1127-shaosong' },
  // 两河义军补
  { name: '京西忠义·翟兴翟进部', armyType: '义军', soldiers: 16000, garrison: '河南·伊阳', regionHint: '京西北路·汴京（宗泽守）', commander: '翟兴·翟进', commanderTitle: '京西north路忠义', quality: '乌合', morale: 60, training: 30, loyalty: 75, control: 45, ethnicity: '汉', equipmentCondition: '简陋', activity: '据伊洛抗金·联络宗泽', composition: [{ type: '山寨忠义', count: 16000 }], sid: 'sc-jianyan1-1127-shaosong' },
  { name: '河东忠义·李彦仙部', armyType: '义军', soldiers: 12000, garrison: '陕州', regionHint: '永兴军路·关陕（西军）', commander: '李彦仙', commanderTitle: '陕州知州·忠义', quality: '精锐', morale: 72, training: 40, loyalty: 88, control: 60, ethnicity: '汉', equipmentCondition: '简陋', activity: '死守陕州·扼河东金路', composition: [{ type: '陕州忠义', count: 10000 }, { type: '弓弩', count: 2000 }], sid: 'sc-jianyan1-1127-shaosong' },
  { name: '群盗·李成众', armyType: '群盗', soldiers: 30000, garrison: '京东·淮西', regionHint: '京东路（宋·义军前沿）', commander: '李成', commanderTitle: '巨盗(将叛投金)', quality: '乌合', morale: 50, training: 20, loyalty: 18, control: 12, ethnicity: '汉', equipmentCondition: '简陋', activity: '剽掠·招而复叛', composition: [{ type: '流民溃兵', count: 30000 }], sid: 'sc-jianyan1-1127-shaosong' },
  // 江防·东南补
  { name: '建康水军·韩世忠舟师', armyType: '水军', soldiers: 9000, garrison: '镇江·建康', regionHint: '江南东路·建康府', commander: '韩世忠(梁红玉佐)', commanderTitle: '御营前军·江防舟师', quality: '精锐', morale: 66, training: 60, loyalty: 78, control: 70, ethnicity: '汉', equipmentCondition: '尚可', activity: '后黄天荡困兀术·梁红玉击鼓', composition: [{ type: '楼船海鳅', count: 6000 }, { type: '弩手', count: 3000 }], sid: 'sc-jianyan1-1127-shaosong' },
  { name: '川峡屯驻·吴璘部', armyType: '禁军', soldiers: 9000, garrison: '川陕', regionHint: '川峡四路·成都府', commander: '吴璘', commanderTitle: '川陕统制', quality: '精锐', morale: 64, training: 68, loyalty: 72, control: 68, ethnicity: '汉', equipmentCondition: '尚可', activity: '与兄吴玠保川陕', composition: [{ type: '步兵', count: 6500 }, { type: '骑兵', count: 1500 }, { type: '弩手', count: 1000 }], sid: 'sc-jianyan1-1127-shaosong' },
  { name: '荆湖·岳飞部(初起)', armyType: '禁军', soldiers: 6000, garrison: '荆湖·江淮', regionHint: '荆湖南北路', commander: '岳飞', commanderTitle: '统制(初起·隶宗泽东京留守司)', quality: '精锐', morale: 70, training: 65, loyalty: 90, control: 75, ethnicity: '汉', equipmentCondition: '尚可', activity: '初露锋芒·治军严明·恢复之志', composition: [{ type: '步兵', count: 4500 }, { type: '背嵬骑', count: 1000 }, { type: '弩手', count: 500 }], sid: 'sc-jianyan1-1127-shaosong' },
  // 金军补
  { name: '金·娄室活女部(陕西)', armyType: '金·铁骑', soldiers: 20000, garrison: '河东·陕西', regionHint: '河东路（金占·八字军抗）', commander: '完颜娄室·活女', commanderTitle: '金·西路万户', quality: '精锐', morale: 74, training: 78, loyalty: 80, control: 80, ethnicity: '女真', equipmentCondition: '精良', activity: '经略陕西·摧西军', composition: [{ type: '女真铁骑', count: 8000 }, { type: '签军步卒', count: 12000 }], sid: 'sc-jianyan1-1127-shaosong' },
  { name: '金·东京辽阳镇兵', armyType: '金·守军', soldiers: 15000, garrison: '东京辽阳', regionHint: '金·东京辽阳府', commander: '完颜宗辅', commanderTitle: '金·东京留守', quality: '普通', morale: 65, training: 65, loyalty: 78, control: 75, ethnicity: '女真·汉·渤海', equipmentCondition: '尚可', activity: '镇辽东·供东路军后', composition: [{ type: '女真', count: 6000 }, { type: '汉渤海签军', count: 9000 }], sid: 'sc-jianyan1-1127-shaosong' }
];

// ════ SLICE 7:堆至满额(tertiary 建炎-绍兴 人物/支系/部队/物品·按 name 幂等)════
const charactersAdd2 = [
  // —— 宰执·侍从·台谏·文臣 ——
  ch('张悫', { officialTitle: '户部尚书', role: '文臣', age: 53, intelligence: 64, administration: 70, integrity: 62, loyalty: 72, stance: '掌邦计·南渡理财', location: '行在', bio: '建炎户部尚书，经画行在财赋，转般和籴以给军食。' }),
  ch('谢克家', { officialTitle: '参知政事', role: '执政', age: 55, intelligence: 66, administration: 65, integrity: 60, loyalty: 70, stance: '副相·调护', location: '行在', bio: '建炎参知政事，尝奉迎隆祐太后，调护行在。' }),
  ch('张守', { officialTitle: '中书舍人·后参政', role: '文臣', age: 44, intelligence: 70, administration: 66, integrity: 70, loyalty: 75, party: '主战派', stance: '论事剀切·主守战', location: '行在', bio: '建炎词臣，论时政剀切，主守战、惜民力。' }),
  ch('刘珏', { officialTitle: '权户部侍郎·护太后', role: '文臣', age: 48, intelligence: 62, administration: 64, integrity: 68, loyalty: 78, stance: '护隆祐太后入赣', location: '江西', bio: '与滕康护隆祐太后避金兵入江西，仓皇之际有调度之劳。' }),
  ch('程瑀', { officialTitle: '给事中', role: '台谏', age: 50, intelligence: 65, integrity: 75, loyalty: 74, party: '主战派', stance: '封驳·骨鲠', location: '行在', bio: '给事中封驳有守，论事不阿，主战守。' }),
  ch('晏敦复', { officialTitle: '吏部侍郎', role: '文臣', age: 49, intelligence: 66, administration: 64, integrity: 80, loyalty: 76, party: '主战派', stance: '晏殊曾孙·守正不挠', location: '行在', traits: ['upright'], bio: '名相晏殊曾孙，守正不挠，后力争不可与金和。' }),
  ch('陈公辅', { officialTitle: '殿中侍御史', role: '台谏', age: 51, intelligence: 64, integrity: 78, loyalty: 75, party: '主战派', stance: '弹章不避权贵', location: '行在', traits: ['upright', 'brave'], bio: '骨鲠台臣，弹劾权幸不避，主战守、辟邪说。' }),
  ch('张九成', { haoName: '横浦先生', officialTitle: '(此时未第·将状元)', role: '士人·理学', age: 35, intelligence: 80, integrity: 82, loyalty: 78, learning: '理学·心学', stance: '主战·程门后学', location: '钱塘', traits: ['talented', 'upright'], bio: '号横浦，从杨时游，主战守。绍兴二年廷对第一，后忤秦桧斥居南安。' }),
  ch('喻樗', { haoName: '玉泉先生', officialTitle: '秘书省正字', role: '学者', age: 38, intelligence: 76, integrity: 75, learning: '理学', stance: '程门后学·识鉴', location: '行在', bio: '号玉泉，理学名儒，善识鉴，尝荐人才于朝。' }),
  ch('谯定', { haoName: '涪陵先生', role: '隐逸·易学', age: 60, intelligence: 82, integrity: 88, valor: 5, learning: '易学·程门', stance: '蜀中易学大师·隐而不仕', location: '蜀·涪陵', traits: ['upright', 'reclusive'], bio: '号涪陵先生，程颐高弟，精易学，隐居蜀中，朝廷屡徵不起。' }),
  ch('路允迪', { officialTitle: '同知枢密院事', role: '执政', age: 56, intelligence: 62, administration: 64, loyalty: 68, integrity: 58, stance: '执政·尝使高丽', location: '行在', bio: '尝奉使高丽(宣和)，建炎入枢府。' }),
  ch('周望', { officialTitle: '两浙宣抚使', role: '文臣·帅', age: 54, intelligence: 58, administration: 60, military: 45, loyalty: 65, integrity: 50, stance: '帅两浙·御金不力', location: '两浙', bio: '建炎宣抚两浙，金兵南下时调度失措。' }),
  ch('卢益', { officialTitle: '同签书枢密院事', role: '执政', age: 57, intelligence: 60, administration: 62, loyalty: 66, integrity: 58, stance: '枢府', location: '行在', bio: '建炎枢府执政。' }),
  ch('胡交修', { officialTitle: '中书舍人', role: '词臣', age: 47, intelligence: 72, administration: 60, charisma: 66, integrity: 68, learning: '进士', stance: '掌外制', location: '行在', bio: '南渡词臣，掌外制，文翰雅赡。' }),
  ch('刘大中', { officialTitle: '起居郎·后参政', role: '文臣', age: 45, intelligence: 68, administration: 66, integrity: 74, loyalty: 76, party: '主战派', stance: '与赵鼎同道', location: '行在', bio: '与赵鼎同道，刚正敢言，后为秦桧所去。' }),
  ch('富季申', { officialTitle: '监察御史', role: '台谏', age: 42, intelligence: 62, integrity: 72, loyalty: 70, stance: '言事', location: '行在', bio: '建炎台臣，纠弹有守。' }),
  ch('李擢', { officialTitle: '户部侍郎', role: '文臣', age: 50, intelligence: 62, administration: 66, integrity: 60, loyalty: 68, stance: '理财', location: '行在', bio: '佐户部经画军食。' }),
  ch('綦更', { name: '富直柔从弟', officialTitle: '郎官', role: '文臣', age: 40, intelligence: 58, administration: 58, integrity: 62, loyalty: 66, stance: '清望子弟', location: '行在', bio: '世家子弟，居郎署。' }),
  // —— 武将 ——
  ch('杨惟忠', { officialTitle: '都统制·宿将', role: '武将', age: 58, valor: 64, military: 66, loyalty: 72, integrity: 60, stance: '西军老将·从御营', location: '江淮', traits: ['veteran'], bio: '西军老将，历宣和靖康，建炎从御营征讨。' }),
  ch('桑仲', { officialTitle: '京西巨豪(亦兵亦盗)', role: '群豪', age: 38, faction: '群盗', valor: 62, military: 55, loyalty: 35, integrity: 30, stance: '据襄汉·时叛时附', location: '京西·襄汉', bio: '京西群豪，拥众据襄汉，时附官军时为盗。' }),
  ch('李横', { officialTitle: '京西招抚·统制', role: '义军', age: 36, valor: 60, military: 52, loyalty: 60, integrity: 50, stance: '京西忠义·后隶官军', location: '京西', bio: '京西忠义之将，后隶官军北伐(绍兴)。' }),
  ch('王𤫉', { name: '王𤫉', officialTitle: '御营统制', role: '武将', age: 40, valor: 60, military: 55, loyalty: 58, integrity: 48, stance: '御营将·从讨群盗', location: '江淮', bio: '御营将领，从张俊讨群盗。' }),
  ch('董平', { officialTitle: '御营将', role: '武将', age: 35, valor: 66, military: 52, loyalty: 60, integrity: 50, stance: '骁将', location: '江淮', traits: ['valiant'], bio: '御营骁将，从征群盗。' }),
  ch('姚端', { officialTitle: '韩世忠部将', role: '武将', age: 32, valor: 72, military: 50, loyalty: 80, integrity: 58, faction: '宋朝廷', stance: '韩家军悍将', location: '江淮', traits: ['valiant'], bio: '韩世忠麾下悍将，骁勇敢战。' }),
  ch('寇成', { officialTitle: '张俊部将', role: '武将', age: 34, valor: 64, military: 50, loyalty: 70, integrity: 45, stance: '张俊部将', location: '江淮', bio: '张俊麾下将，从讨群盗。' }),
  ch('徐庆', { officialTitle: '岳飞部将', role: '武将', age: 33, valor: 70, military: 55, loyalty: 85, integrity: 65, faction: '宋朝廷', stance: '岳家军骁将', location: '荆湖', traits: ['valiant', 'loyal'], bio: '岳飞麾下骁将，岳家军元从。' }),
  ch('王贵', { officialTitle: '岳飞部将', role: '武将', age: 33, valor: 68, military: 58, loyalty: 80, integrity: 60, faction: '宋朝廷', stance: '岳家军统制', location: '荆湖', traits: ['valiant'], bio: '岳飞麾下统制，岳家军左翼之将。' }),
  ch('庞荣', { officialTitle: '岳飞部将', role: '武将', age: 31, valor: 62, military: 50, loyalty: 80, integrity: 60, faction: '宋朝廷', stance: '岳家军', location: '荆湖', bio: '岳飞元从部将。' }),
  ch('傅选', { officialTitle: '统制', role: '武将', age: 35, valor: 58, military: 50, loyalty: 60, integrity: 45, stance: '诸军统制', location: '江淮', bio: '建炎诸军统制。' }),
  ch('郝晸', { officialTitle: '河东忠义将', role: '义军', age: 37, valor: 64, military: 52, loyalty: 72, integrity: 58, stance: '河东抗金·从王彦', location: '河东·太行', bio: '八字军部将，从王彦据太行抗金。' }),
  ch('马进', { officialTitle: '群盗(李成党)', role: '群盗', age: 33, faction: '群盗', valor: 60, military: 50, loyalty: 20, integrity: 18, stance: '李成羽翼·剽掠江西', location: '江西', bio: '李成党羽，剽掠江西，后为岳飞所破。' }),
  ch('关师古', { officialTitle: '熙河经略·统制', role: '武将', age: 40, valor: 60, military: 58, loyalty: 70, integrity: 55, stance: '熙河西军', location: '关陕·熙河', bio: '熙河路统制，西军一支，后陷于金。' }),
  ch('邵隆', { name: '邵隆', officialTitle: '李彦仙部将', role: '义军', age: 30, valor: 68, military: 50, loyalty: 82, integrity: 65, stance: '陕州忠义·守商虢', location: '陕州', traits: ['valiant', 'loyal'], bio: '李彦仙部将，陕州陷后犹据商虢抗金。' }),
  ch('张玘', { officialTitle: '京西忠义', role: '义军', age: 34, valor: 62, military: 50, loyalty: 75, integrity: 60, stance: '京西抗金', location: '京西', bio: '京西忠义之将，据险抗金。' }),
  ch('巨师古旧部·王进', { name: '王进', officialTitle: '统领', role: '武将', age: 36, valor: 56, military: 48, loyalty: 60, integrity: 50, stance: '御营统领', location: '江淮', bio: '御营统领，从征群盗。' }),
  // —— 金将·金臣 ——
  ch('完颜阇母', { officialTitle: '金·都统', role: '金将', age: 45, faction: '金国（大金）', ethnicity: '女真', valor: 74, military: 70, loyalty: 80, integrity: 50, family: '完颜氏', stance: '宗室宿将·攻山东', location: '河北', traits: ['valiant'], bio: '金宗室宿将，号"金兀术叔行"，攻略山东河北。' }),
  ch('完颜拔离速', { officialTitle: '金·万户', role: '金将', age: 38, faction: '金国（大金）', ethnicity: '女真', valor: 76, military: 68, loyalty: 78, integrity: 48, stance: '东路骁将·搜山检海', location: '河北', traits: ['valiant'], bio: '金东路骁将，后从兀术"搜山检海"穷追高宗。' }),
  ch('撒离喝', { name: '完颜杲(撒离喝)', officialTitle: '金·西路都统', role: '金将', age: 40, faction: '金国（大金）', ethnicity: '女真', valor: 72, military: 74, intelligence: 60, loyalty: 78, integrity: 50, stance: '西路名将·经略陕西', location: '陕西', traits: ['valiant'], bio: '金西路名将，号"啼哭郎君"，与吴玠争锋于和尚原仙人关。' }),
  ch('韩企先', { officialTitle: '金·尚书右仆射(汉相)', role: '金臣(汉)', age: 46, faction: '金国（大金）', ethnicity: '汉', intelligence: 78, administration: 80, loyalty: 70, integrity: 60, stance: '金初汉相·建汉制', location: '燕京·会宁', traits: ['administrator'], bio: '燕地汉人，金初名相，定官制、收人才，金朝汉化典制多出其手。' }),
  ch('蔡松年', { officialTitle: '金·都元帅府幕(汉·词人)', role: '金臣(汉)', age: 21, faction: '金国（大金）', ethnicity: '汉', intelligence: 80, administration: 64, charisma: 72, loyalty: 55, integrity: 40, learning: '词章', stance: '降金·词名(明秀集)', location: '燕京', traits: ['talented'], bio: '蔡靖子，随父降金，仕金为词臣，词名甚著(《明秀集》)，后位至宰相。' }),
  ch('张孝纯', { officialTitle: '金·伪职(原宋太原守)', role: '降臣', age: 60, faction: '金国（大金）', ethnicity: '汉', intelligence: 60, administration: 62, loyalty: 30, integrity: 35, stance: '守太原力竭被俘·仕刘豫', location: '河东', bio: '原宋太原帅，守城逾年城陷被俘，后仕伪齐刘豫为相，士论惜之。' }),
  ch('高桢', { officialTitle: '金·汉臣', role: '金臣(汉)', age: 44, faction: '金国（大金）', ethnicity: '汉', intelligence: 66, administration: 68, loyalty: 65, integrity: 55, stance: '佐治汉地', location: '燕京', bio: '金用汉臣，佐治燕云签调。' }),
  // —— 义军·水寨·群豪(将起之乱) ——
  ch('钟相', { officialTitle: '洞庭乡社首领(将起兵)', role: '义军领袖', age: 50, faction: '群盗', intelligence: 60, valor: 55, military: 50, loyalty: 40, integrity: 45, ambition: 75, stance: '"等贵贱均贫富"·将起洞庭', location: '荆湖·鼎州', personality: '托神道聚众', traits: ['ambitious'], bio: '鼎州人，以"等贵贱、均贫富"号召乡社，建炎四年将起兵称楚，洞庭之乱之首。' }),
  ch('杨幺', { name: '杨幺', officialTitle: '洞庭水寨(将起)', role: '义军', age: 30, faction: '群盗', valor: 64, military: 58, loyalty: 40, integrity: 42, stance: '钟相余部·洞庭车船水寨', location: '荆湖·洞庭', traits: ['valiant'], bio: '钟相部将，后据洞庭车船水寨抗官军，为南宋腹心之患，终为岳飞所平。' }),
  ch('范汝为', { officialTitle: '建州乡兵(将起)', role: '义军', age: 35, faction: '群盗', valor: 58, military: 50, loyalty: 38, integrity: 45, stance: '闽中民变之首(将起)', location: '福建·建州', bio: '建州人，建炎绍兴间因苛敛聚众起事，闽中震动。' }),
  ch('张荣', { officialTitle: '梁山泊水寨', role: '义军', age: 40, valor: 62, military: 58, loyalty: 65, integrity: 55, stance: '梁山泊水寨抗金·后归官军', location: '京东·梁山泊', traits: ['valiant'], bio: '聚梁山泊水寨，以舟师败金人于缩头湖(鼍潭湖)，后归官军。' }),
  ch('马友', { officialTitle: '湖南群豪', role: '群豪', age: 36, faction: '群盗', valor: 58, military: 52, loyalty: 45, integrity: 42, stance: '据湖南·时叛时附', location: '荆湖南路', bio: '湖南群豪，拥众数万，往来潭鼎，时附官军。' }),
  ch('曹成', { officialTitle: '群盗(将为岳飞所破)', role: '群盗', age: 35, faction: '群盗', valor: 60, military: 52, loyalty: 30, integrity: 30, stance: '剽掠湖广·拒招', location: '荆湖·广南', bio: '群盗巨魁，众十余万，剽掠湖广，后为岳飞所破(杨再兴即出其军)。' }),
  ch('商元', { officialTitle: '京东忠义', role: '义军', age: 33, valor: 56, military: 48, loyalty: 68, integrity: 55, stance: '京东抗金', location: '京东', bio: '京东忠义之将，聚乡兵抗金。' }),
  ch('李宏', { officialTitle: '群盗·后招安', role: '群豪', age: 34, faction: '群盗', valor: 55, military: 48, loyalty: 45, integrity: 40, stance: '淮南群豪', location: '淮南', bio: '淮南群豪，后受招安。' }),
  // —— 后妃·宗室·近习 ——
  ch('张婕妤', { name: '张氏(婕妤)', role: '后妃', gender: '女', age: 20, isRoyal: true, royalRelation: '高宗嫔御', loyalty: 75, charisma: 65, family: '张氏', stance: '行在嫔御', location: '行在', bio: '高宗南渡嫔御，从帝播迁。' }),
  ch('赵伯琮', { name: '赵伯琮', role: '宗室幼', age: 1, isRoyal: true, royalRelation: '太祖七世孙(后为孝宗)', loyalty: 90, family: '赵氏·大宋皇室', stance: '太祖之后·后选育宫中(将为孝宗)', location: '宗室', bio: '太祖七世孙，建炎元年生。高宗独子赵旉早夭后，将选育宫中，是为后来之孝宗。' }),
  ch('赵令畤', { haoName: '聊复翁', officialTitle: '右朝请大夫·宗室', role: '宗室·文士', age: 60, isRoyal: true, royalRelation: '太祖六世孙', intelligence: 74, charisma: 68, integrity: 65, learning: '词章', family: '赵氏·大宋皇室', stance: '宗室文士·与苏轼游', location: '行在', traits: ['talented'], bio: '太祖六世孙，工词善文，尝与苏轼游(《侯鲭录》作者)。' }),
  ch('王继先', { officialTitle: '御医·近习', role: '近习', age: 40, intelligence: 60, charisma: 65, loyalty: 70, integrity: 25, ambition: 60, stance: '高宗信任之医·将干政', location: '行在', personality: '医而干政·贪墨', traits: ['greedy', 'cunning'], bio: '以医术得幸于高宗，恃宠干预，后骄横贪墨，士论丑之。' }),
  ch('张去为', { officialTitle: '入内内侍·近习', role: '内侍', age: 38, intelligence: 55, charisma: 58, loyalty: 72, integrity: 30, stance: '高宗近习宦官·主和', location: '行在', bio: '高宗近习宦官，主和避战，士大夫恶之。' }),
  ch('蓝公佐', { officialTitle: '内侍·奉使', role: '内侍', age: 42, intelligence: 56, loyalty: 65, integrity: 40, stance: '奉使往来', location: '行在', bio: '内侍，建炎间奉使往来金宋之间。' }),
  // —— 周边外臣 ——
  ch('任得敬', { officialTitle: '西夏·将(原宋降人)', role: '西夏臣', age: 35, faction: '西夏', ethnicity: '汉', intelligence: 66, administration: 64, valor: 50, ambition: 80, loyalty: 50, integrity: 30, stance: '宋降人仕夏·后专权', location: '兴庆府', traits: ['ambitious', 'cunning'], bio: '原宋西安州通判，城陷降夏，以女进西夏崇宗，后专夏国之政、几裂土自立。' }),
  ch('萧合达', { officialTitle: '西夏·夏州都统(契丹人)', role: '西夏将', age: 44, faction: '西夏', ethnicity: '契丹', valor: 66, military: 62, loyalty: 55, integrity: 50, stance: '辽遗臣仕夏·镇夏州', location: '夏州', bio: '辽契丹人，辽亡仕夏，镇夏州，后因辽亡之痛叛夏附蒙古遗绪。' }),
  ch('高令则', { officialTitle: '大理·相国', role: '大理臣', age: 50, faction: '大理国', ethnicity: '白蛮', intelligence: 68, administration: 70, loyalty: 70, integrity: 60, stance: '高氏世相·权倾段氏', location: '大理', bio: '大理高氏世为相国，"高国主"权倾段氏王室，段正严之政多决于高氏。' }),
  ch('拓俊京', { name: '拓俊京', officialTitle: '高丽·武臣', role: '高丽臣', age: 48, faction: '高丽', ethnicity: '高丽', valor: 62, military: 58, loyalty: 50, ambition: 65, integrity: 45, stance: '平李资谦之乱·武臣', location: '开京', bio: '高丽武臣，平李资谦之乱有功，后亦以专恣被黜，高丽武臣跋扈之渐。' }),
  ch('完颜蒲鲁虎', { name: '完颜蒲鲁虎', officialTitle: '金·宗室', role: '金贵', age: 30, faction: '金国（大金）', ethnicity: '女真', valor: 60, military: 55, loyalty: 70, integrity: 45, family: '完颜氏', stance: '金宗室', location: '会宁', bio: '金宗室子弟，从军南征。' }),
  // —— 文化·医卜·方外 ——
  ch('陈与义旧交·周紫芝', { name: '周紫芝', haoName: '竹坡居士', role: '词人', age: 45, intelligence: 76, charisma: 68, integrity: 55, learning: '词章', stance: '南渡词人', location: '江南', traits: ['talented'], bio: '号竹坡居士，南渡词人，诗词清丽。' }),
  ch('许翰旧僚·李正民', { name: '李正民', officialTitle: '中书舍人', role: '词臣', age: 46, intelligence: 70, administration: 60, integrity: 66, loyalty: 72, learning: '进士', stance: '掌制·奉使', location: '行在', bio: '南渡词臣，掌外制，尝奉使军前。' }),
  ch('道士·林灵素余党', { name: '皇城司探事', role: '近习·探事', age: 35, intelligence: 58, loyalty: 60, integrity: 35, stance: '皇城司刺探', location: '行在', bio: '皇城司探事，刺探京城动静，耳目之任。' })
];

const familiesAdd3 = [
  family('晏氏·临川相门', 'civil', 70, '抚州临川', '晏殊(元献公)', ['晏殊', '晏几道', '晏敦复'], '晏敦复', ['晏敦复'], '临川晏氏，元献公晏殊为仁宗名相、词宗，小山几道继词名，敦复守正于建炎。'),
  family('蔡氏·莆田(降金一支)', 'civil', 40, '兴化莆田', '蔡京(已败)', ['蔡京', '蔡靖', '蔡松年'], '(分崩·一支降金)', ['蔡松年'], '莆田蔡氏，蔡京权相败亡为靖康祸首之一；旁支蔡靖松年父子降金仕燕，家声两歧。'),
  family('韩氏·相州(世忠一系)', 'military', 70, '延安', '韩世忠', ['韩世忠'], '韩世忠', ['韩世忠', '梁红玉'], '延安韩氏，世忠起行伍为中兴名将，梁红玉佐之，黄天荡之功震金人。'),
  family('岳氏·汤阴', 'military', 78, '相州汤阴', '岳飞', ['岳飞'], '岳飞', ['岳飞', '岳云', '张宪'], '汤阴岳氏，岳飞精忠报国、治军严明，"撼山易撼岳家军难"，南宋恢复之望所寄。'),
  family('吴氏·后族(宪圣)', 'consort', 68, '开封', '(高宗宪圣吴皇后之族)', ['吴益', '吴盖'], '(吴氏才人)', ['吴氏'], '高宗吴皇后(宪圣)之族，后历四朝、为南宋后宫柱石，外戚以谨饬称。'),
  family('钟氏·鼎州(将叛)', 'rebel', 30, '鼎州武陵', '钟相', ['钟相'], '钟相', ['钟相', '杨幺'], '鼎州钟氏，钟相以"等贵贱均贫富"聚众，杨幺继之据洞庭，荆湖巨患。'),
  family('刘氏·伪齐(豫)', 'rebel', 25, '景州阜城', '刘豫', ['刘豫'], '刘豫', ['刘豫', '刘麟'], '阜城刘氏，刘豫杀官降金，将受金册为"齐帝"治河南山东，为金人傀儡，士论唾之。'),
  family('折氏·府州(本宗)', 'military', 70, '府州', '折从阮', ['折御卿', '折可适'], '折彦质', ['折彦质'], '府州折氏本宗，彦质守节于宋(别详折氏世将)。'),
  family('张氏·伪楚旧党(邦昌)', 'rebel', 20, '永静军', '张邦昌(已废)', ['张邦昌'], '(伏诛)', [], '张邦昌为金所立"楚"帝，高宗即位自废，旋以僭逆赐死，附楚诸人皆污。'),
  family('綦氏·北海', 'civil', 55, '潍州北海', '綦崇礼', ['綦崇礼'], '綦崇礼', ['綦崇礼'], '北海綦氏，崇礼以文翰掌内制，南渡词臣之选。'),
  family('胡氏·崇安(理学)', 'civil', 72, '建州崇安', '胡安国(文定公)', ['胡安国', '胡寅', '胡宏'], '胡安国', ['胡安国', '胡寅', '胡宏'], '崇安胡氏，文定公安国治《春秋》，寅宏继之，开湖湘之学，理学名门。'),
  family('尹氏·洛阳(和靖)', 'civil', 65, '河南洛阳', '尹焞', ['尹焞'], '尹焞', ['尹焞'], '洛阳尹氏，和靖先生尹焞守程门正脉，靖康不污伪命，理学清望。'),
  family('段氏·大理高氏', 'noble', 70, '大理', '高升泰', ['高升泰', '高量成'], '高令则', ['高令则'], '大理高氏世为相国("高国主")，权倾段氏王室，实掌大理之政。'),
  family('任氏·西夏权门', 'noble', 50, '兴庆府', '任得敬', ['任得敬'], '任得敬', ['任得敬'], '宋降人任得敬以女进西夏崇宗，骤贵专夏政，后几裂土，西夏外戚之祸。')
];

const troopsAdd2 = [
  { name: '御营·张俊讨盗别部', armyType: '禁军', soldiers: 7000, garrison: '江淮', regionHint: '江南东路·建康府', commander: '张俊', commanderTitle: '御营右军·讨盗', quality: '普通', morale: 54, training: 54, loyalty: 60, control: 62, ethnicity: '汉', equipmentCondition: '尚可', activity: '征讨群盗', composition: [{ type: '步兵', count: 5500 }, { type: '骑兵', count: 1500 }], sid: SID },
  { name: '御营·杨惟忠部', armyType: '禁军', soldiers: 6000, garrison: '江淮', regionHint: '江南东路·建康府', commander: '杨惟忠', commanderTitle: '都统制·西军老将', quality: '普通', morale: 52, training: 56, loyalty: 68, control: 60, ethnicity: '汉', equipmentCondition: '尚可', activity: '宿将统军', composition: [{ type: '步兵', count: 4500 }, { type: '骑兵', count: 1500 }], sid: SID },
  { name: '熙河关师古部', armyType: '禁军', soldiers: 8000, garrison: '熙河', regionHint: '永兴军路·关陕（西军）', commander: '关师古', commanderTitle: '熙河经略·统制', quality: '普通', morale: 54, training: 58, loyalty: 65, control: 55, ethnicity: '汉·蕃', equipmentCondition: '简陋', activity: '熙河西军·后陷金', composition: [{ type: '步兵', count: 5500 }, { type: '蕃汉骑兵', count: 2500 }], sid: SID },
  { name: '陕州忠义·邵隆部', armyType: '义军', soldiers: 7000, garrison: '商虢', regionHint: '永兴军路·关陕（西军）', commander: '邵隆', commanderTitle: '李彦仙部将', quality: '乌合', morale: 70, training: 35, loyalty: 82, control: 55, ethnicity: '汉', equipmentCondition: '简陋', activity: '陕州陷后据商虢抗金', composition: [{ type: '忠义乡兵', count: 7000 }], sid: SID },
  { name: '京西忠义·李横部', armyType: '义军', soldiers: 9000, garrison: '京西', regionHint: '京西北路·汴京（宗泽守）', commander: '李横', commanderTitle: '京西招抚·统制', quality: '乌合', morale: 58, training: 32, loyalty: 65, control: 45, ethnicity: '汉', equipmentCondition: '简陋', activity: '京西忠义·北望恢复', composition: [{ type: '忠义乡兵', count: 9000 }], sid: SID },
  { name: '梁山泊水寨·张荣', armyType: '水军', soldiers: 8000, garrison: '梁山泊', regionHint: '京东路（宋·义军前沿）', commander: '张荣', commanderTitle: '梁山泊水寨', quality: '普通', morale: 64, training: 45, loyalty: 65, control: 55, ethnicity: '汉', equipmentCondition: '简陋', activity: '舟师抗金·缩头湖之捷', composition: [{ type: '水寨舟师', count: 8000 }], sid: SID },
  { name: '荆湖群盗·曹成众', armyType: '群盗', soldiers: 50000, garrison: '荆湖·广南', regionHint: '荆湖南北路', commander: '曹成', commanderTitle: '巨盗(拒招)', quality: '乌合', morale: 48, training: 18, loyalty: 22, control: 15, ethnicity: '汉', equipmentCondition: '简陋', activity: '剽掠湖广·后为岳飞破', composition: [{ type: '流民群盗', count: 50000 }], sid: SID },
  { name: '湖南群豪·马友部', armyType: '群盗', soldiers: 30000, garrison: '潭州', regionHint: '荆湖南北路', commander: '马友', commanderTitle: '湖南群豪', quality: '乌合', morale: 46, training: 20, loyalty: 40, control: 25, ethnicity: '汉', equipmentCondition: '简陋', activity: '据湖南·时附时叛', composition: [{ type: '群豪乡兵', count: 30000 }], sid: SID },
  { name: '洞庭乡社·钟相(将起)', armyType: '群盗', soldiers: 40000, garrison: '鼎州·洞庭', regionHint: '荆湖南北路', commander: '钟相·杨幺', commanderTitle: '"等贵贱均贫富"', quality: '乌合', morale: 55, training: 15, loyalty: 35, control: 20, ethnicity: '汉', equipmentCondition: '简陋', activity: '托神道聚众·将据洞庭车船', composition: [{ type: '乡社水寨', count: 40000 }], sid: SID },
  { name: '建康水军·别部', armyType: '水军', soldiers: 6000, garrison: '采石·建康', regionHint: '江南东路·建康府', commander: '行在水军', commanderTitle: '江防别部', quality: '普通', morale: 52, training: 48, loyalty: 60, control: 55, ethnicity: '汉', equipmentCondition: '尚可', activity: '采石江防', composition: [{ type: '战棹水兵', count: 4500 }, { type: '弩手', count: 1500 }], sid: SID },
  { name: '福建路屯驻', armyType: '厢军', soldiers: 7000, garrison: '福州', regionHint: '福建路', commander: '路分都监', commanderTitle: '福建屯驻', quality: '普通', morale: 48, training: 42, loyalty: 60, control: 55, ethnicity: '汉', equipmentCondition: '尚可', activity: '弹压闽中', composition: [{ type: '屯驻步兵', count: 5500 }, { type: '土兵', count: 1500 }], sid: SID },
  { name: '广南屯驻·摧锋军', armyType: '厢军', soldiers: 6000, garrison: '广州', regionHint: '广南东路·香山', commander: '广东帅司', commanderTitle: '摧锋军', quality: '普通', morale: 50, training: 48, loyalty: 60, control: 55, ethnicity: '汉', equipmentCondition: '尚可', activity: '弹压岭南·防海寇', composition: [{ type: '摧锋步兵', count: 4500 }, { type: '弩手', count: 1500 }], sid: SID },
  { name: '川陕宣抚·吴玠都统兵', armyType: '禁军', soldiers: 14000, garrison: '川陕·凤翔', regionHint: '川峡四路·成都府', commander: '吴玠', commanderTitle: '川陕宣抚司都统制', quality: '精锐', morale: 66, training: 70, loyalty: 75, control: 70, ethnicity: '汉', equipmentCondition: '尚可', activity: '保川陕门户·和尚原之将', composition: [{ type: '步兵(强弩)', count: 10000 }, { type: '骑兵', count: 2500 }, { type: '神臂弓', count: 1500 }], sid: SID },
  { name: '金·阇母山东兵', armyType: '金·铁骑', soldiers: 25000, garrison: '山东', regionHint: '京东路（宋·义军前沿）', commander: '完颜阇母', commanderTitle: '金·都统(攻山东)', quality: '精锐', morale: 72, training: 76, loyalty: 78, control: 78, ethnicity: '女真·汉签军', equipmentCondition: '精良', activity: '攻略山东·与宋义军争', composition: [{ type: '女真铁骑', count: 9000 }, { type: '签军步卒', count: 16000 }], sid: SID },
  { name: '金·撒离喝陕西兵', armyType: '金·铁骑', soldiers: 22000, garrison: '陕西', regionHint: '永兴军路·关陕（西军）', commander: '完颜杲(撒离喝)', commanderTitle: '金·西路都统', quality: '精锐', morale: 70, training: 76, loyalty: 78, control: 78, ethnicity: '女真·汉签军', equipmentCondition: '精良', activity: '与吴玠争锋·谋取关陕', composition: [{ type: '女真铁骑', count: 8000 }, { type: '签军步卒', count: 14000 }], sid: SID },
  { name: '金·韩常燕京戍兵', armyType: '金·守军', soldiers: 16000, garrison: '燕京', regionHint: '河北东路（金占）', commander: '韩常', commanderTitle: '金·燕京戍将(汉)', quality: '普通', morale: 64, training: 64, loyalty: 70, control: 72, ethnicity: '汉·女真', equipmentCondition: '尚可', activity: '镇燕云·供东路军', composition: [{ type: '签军步卒', count: 12000 }, { type: '女真骑', count: 4000 }], sid: SID },
  { name: '西夏·铁鹞子', armyType: '夏·铁骑', soldiers: 15000, garrison: '兴庆·灵夏', regionHint: '西夏（河套·灵夏）', commander: '李乾顺(萧合达将)', commanderTitle: '西夏·擒生军/铁鹞子', quality: '精锐', morale: 66, training: 70, loyalty: 70, control: 70, ethnicity: '党项', equipmentCondition: '精良', activity: '乘宋金之衅取宋西陲', composition: [{ type: '铁鹞子重骑', count: 5000 }, { type: '步跋子·擒生', count: 10000 }], sid: SID },
  { name: '大理·象阵兵', armyType: '理·步骑', soldiers: 10000, garrison: '大理', regionHint: '大理国', commander: '高令则', commanderTitle: '大理·相国统兵', quality: '普通', morale: 55, training: 50, loyalty: 60, control: 60, ethnicity: '白蛮·诸蛮', equipmentCondition: '尚可', activity: '守境·罕预中原', composition: [{ type: '蛮兵步卒', count: 8000 }, { type: '战象·骑', count: 2000 }], sid: SID }
];

const itemsAdd = [
  item('宣和殿玉辂', 'treasure', '天子大驾卤簿之玉辂，靖康播迁多所散失，乘舆法物之重。', '彰天子仪卫·正名分', '史诗', '行在', 300000, '徽宗朝御制', ''),
  item('崇宁监交子铜版', 'token', '官交子印造铜版之一，纸币法物。', '济军用·通货(慎)', '稀有', '行在', 80000, '崇宁置交子务', '滥发则楮轻物贵'),
  item('景德镇影青瓷', 'treasure', '饶州景德镇青白瓷，南渡后外销番舶之大宗。', '通市舶·助财用', '稀有', '市舶司', 120000, '景德中始贡', ''),
  item('建窑兔毫盏', 'treasure', '建州黑釉兔毫盏，斗茶之珍，士林雅玩。', '清赏·斗茶', '稀有', '士林', 18000, '建州窑所出', ''),
  item('洮河绿石砚', 'treasure', '洮州绿石砚，与端歙并称，文房之珍。', '文房·清赏', '稀有', '士林', 16000, '洮河所出', ''),
  item('大观圣作之碑·拓', 'document', '徽宗御书八行取士之碑拓本，劝学之制。', '彰教化·劝学', '稀有', '州学', 30000, '大观元年颁', ''),
  item('蹴鞠·齐云社谱', 'document', '汴京齐云社蹴鞠之谱，承平游艺之遗。', '宴游·励士气(微)', '普通', '军中', 5000, '汴京旧俗', ''),
  item('占城稻种', 'special', '早熟耐旱之稻，宋初引自占城，东南赖以足食。', '增农获·实仓廪', '稀有', '东南诸路', 60000, '大中祥符引种', '广种则江淮足食'),
  item('猛火油', 'weapon', '石脑油(石油)所制，水陆纵火，守城拒舟之烈器。', '纵火·守城拒舟', '稀有', '军器所', 25000, '宋军制式', ''),
  item('床子弩', 'weapon', '守城巨弩，数人绞轴而发，一矢可贯数人、钉人于城。', '守城·破阵', '史诗', '诸城', 40000, '宋军制式', ''),
  item('克敌弓', 'weapon', '神臂弓之属，韩世忠军所制劲弩，洞重铠。', '远射·克骑', '稀有', '韩家军', 30000, '韩世忠军制', ''),
  item('麻札刀·提刀', 'weapon', '岳家军斫马足、入阵刺杀之制式，撼金骑之利。', '破铁骑·近战', '稀有', '岳家军', 18000, '岳家军制', ''),
  item('明光铠', 'armor', '将帅重铠，胸背圆护磨砺如镜，临阵耀目。', '将帅防御·励士', '史诗', '将帅', 50000, '历代重铠', ''),
  item('皮室·铁浮屠(缴获)', 'armor', '金人铁浮屠重骑之全装甲(缴获研之)，人马俱铠。', '研敌制胜·仿制', '传说', '(缴获)', 60000, '金军重骑装具', '得其制则可仿练具装以制骑'),
  item('隆祐太后宝', 'seal', '元祐太后(隆祐)之宝。靖康后太后以宫眷独存，垂帘定策迎立高宗，宝重所系。', '彰太后定策·安人心', '史诗', '隆祐太后', 400000, '元符废后·靖康复尊', '太后宝在则高宗即位之法统益固'),
  item('靖康稗史·记注', 'document', '靖康丧乱之记注稗史，二帝北狩之痛史，志士所传抄。', '励复仇之志·彰国耻', '稀有', '士林', 20000, '靖康亲历者所记', '广传则人心思奋'),
  item('茶引·盐钞', 'token', '榷茶榷盐之引钞，国用所仰之大宗，可质可鬻。', '榷货济用·通商', '稀有', '榷货务', 90000, '宋榷茶盐之制', ''),
  item('海道针经', 'document', '市舶海商所用罗盘针路之经，通番舶之秘。', '通市舶·助海贸', '稀有', '市舶司', 40000, '宋海商所积', '番舶之利赖之')
];

module.exports = {
  government, military, rules, timeline, mechanicsConfig, cities,
  items: items.concat(itemsAdd),
  culturalWorks,
  familiesAdd: familiesAdd.concat(familiesAdd2).concat(familiesAdd3),
  charactersAdd: charactersAdd.concat(charactersAdd2),
  troopsAdd: troopsAdd.concat(troopsAdd2)
};
