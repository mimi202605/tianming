const events = {
  candidateEvents: [
    {
      id: 'memorial_eunuch_audit',
      title: '司礼监秉笔涂文辅奏：库藏亏空大审',
      type: 'memorial',
      presenter: '涂文辅',
      triggerCondition: 'T1 自动触发（新帝初政·阉党例行报数）',
      payload: '司礼监掌印王体乾、秉笔涂文辅奏报：内廷各监局岁出岁进，御马监年费四十万两、衣冠局年费十八万两……东厂缇骑月饷三万四千、诏狱官库存粮三十万石。客氏奉圣夫人月脂粉费四千两。请陛下圣裁……（虚数+聚敛实况）',
      rationale: '阉党例行报数·探新帝对财权掌握之态·暗示魏忠贤权势已成体系'
    },
    {
      id: 'urgent_memorial_liaodong_famine',
      title: '辽东经略阎鸣泰告急：关宁三镇欠饷三月',
      type: 'urgent_memorial',
      presenter: '阎鸣泰',
      triggerCondition: 'T1-T2 自动；若玩家T2未批辽饷则重发',
      payload: '经略使阎鸣泰疏至：关宁三镇（山海、宁远、皮岛）守将祖大寿、满桂、毛文龙各请饷十五至二十万。今太仓仅存银八十万，此月若不饷，将士势必哗变，后金鼓噪绕塞已非今日之忧……恳请内阁迅决加派，莫使国门落于异族。',
      rationale: '军事压力最急·军费缺口推高加派·映射新帝掌权三月内的第一次加派危机'
    },
    {
      id: 'letter_donglin_tentative',
      title: '韩爌家书：故相之意·隐试帝心',
      type: 'letter',
      presenter: '韩爌',
      triggerCondition: 'T2-T3 若玩家未重用东林派则自动；若已召见则条件满足',
      payload: '吏部故尚书韩爌家书递进宫：伏闻陛下天纵睿智，年方十七而操纵若老成……六君子诸公之志，陛下心中尚有否？天启四年之冤，臣族兄杨涟、故友左光斗之骨，何日可白？臣山东乡野，朝廷若有召，愿以迟暮之年分陛下一忧。 夹纸条：关键官缺（如吏部、都察院）或人事任命之关键词。',
      rationale: '东林派试探新帝·探路召用机制·暗示新帝若欲翻盘必需东林支撑'
    },
    {
      id: 'chaoyi_fiscal_policy',
      title: '廷议：加派VS官养 ·明年辽饷之策',
      type: 'chaoyi_topic',
      presenter: '黄立极',
      triggerCondition: 'T2 若辽饷未决·或T3若上两月未加派足额',
      payload: '首辅黄立极启奏上殿廷议：陛下，辽饷年需五百万，太仓已竭。今岁加派亩税九厘，明岁势必再增。然北方连旱，陕西、河南民食已尽，再加一厘恐生乱。臣建议：甲案·官养兵：精兵万五千驻关宁，沿线屯田自足；乙案·借账：令江南缙绅、商贾承认国债三百万，年赋一十万利息……陛下圣裁。',
      rationale: '财政困局逼迫新帝做长期选择·两案都有陷阱·甲案强化边镇独立·乙案激怒南方'
    },
    {
      id: 'anomaly_shaanxi_rumor',
      title: '陕西巡抚胡廷宴奏报：陕北灾况虚实',
      type: 'anomaly',
      presenter: '胡廷宴',
      triggerCondition: 'T2-T3 自动；若玩家验证或派钦差则条件触发',
      payload: '陕西巡抚胡廷宴奏报：陕北连年大旱，西安府、庆阳府、延安府民食尽矣。然臣巡视实况，灾象未至十分凶悍……民间传言有流民头目王二在白水驰聚众，不过闻风而逃——臣判系流言蜚语，绝无甚事。（暗指：官员粉饰太平、灾况瞒报、民变种子已埋）',
      rationale: '隐喻官僚体系失效·小冰河与政治压力的碰撞点·暗示民变启动倒计时'
    },
    {
      id: 'letter_caijing_secret',
      title: '内廷秘报：客氏与魏忠贤权争微妙',
      type: 'letter',
      presenter: '王承恩',
      triggerCondition: 'T2 私密渠道·信王旧仆王承恩密言',
      payload: '王承恩（陛下信邸旧仆，今侍寝官）密启陛下：奉圣夫人客氏与九千岁近日龃龉。客夫人欲收天启朝张皇后之女妹入宫，而魏忠贤欲令女儿上位……司礼监内两派已成势。陛下新政，若不先手制肘，恐日后为患。',
      rationale: '内廷权力变动·王承恩为新帝与旧势力间的唯一信任通道·引出后来的人事翻盘之机'
    },
    {
      id: 'memorial_dajin_intelligence',
      title: '锦衣卫田尔耕奏：后金皇太极堂弟反叛信号',
      type: 'urgent_memorial',
      presenter: '田尔耕',
      triggerCondition: 'T3 若玩家已与辽东交涉3次以上则自动；或谍报素质高则提前',
      payload: '锦衣卫指挥使田尔耕奏报谍报：后金皇太极之弟多铎、弟弟德格类互相猜忌，皇太极弟莽古尔泰因朝鲜来信……朝鲜王李倧态度生变，与皇太极约朝贡并背盟，东伐之后下一步必绕蒙古入塞。我方宁远防线虽有满桂、祖大寿，兵不过两千……恳陛下预留应对。',
      rationale: '军事情报·映射后金真实威胁升高·为中期辽东危机埋下伏笔'
    },
    {
      id: 'audience_eunuch_monopoly',
      title: '新帝私密召见：司礼监权力运作详解',
      type: 'audience',
      presenter: '王体乾',
      triggerCondition: 'T1-T2 若玩家未与司礼监接触则自动；或新帝亲政意愿强则延迟',
      payload: '司礼监掌印王体乾（代魏忠贤面见新帝）献媚奏报：陛下，内廷六监八局二十四衙门，皆由司礼监掌握批红权。文书自内阁至陛下，皆经司礼监过目——此乃祖宗旧制，陛下可对历任批红官卷……臣愿为陛下执笔，确保圣意无虞。 ——权力运作全景。',
      rationale: '新帝初识司礼监权力之大·为后来推翻魏忠贤做铺垫·明示权力钉子已然'
    }
  ],
  sequencing: '建议触发顺序：T1 先发内廷报数（memorial_eunuch_audit）与辽东告急（urgent_memorial_liaodong_famine），让新帝知晓权力全景与军费困局；T2 发东林试探信（letter_donglin_tentative）、廷议加派（chaoyi_fiscal_policy）、陕西虚实（anomaly_shaanxi_rumor），逼新帝做第一轮权力选择；T3 发内廷权争（letter_caijing_secret）、军情升温（memorial_dajin_intelligence），引向中期剧情。',
  branchingLogic: '玩家若T2快速许诺辽饷+东林与官缺，则后金智报升温、陕西灾象升格为民变预警，引向对外用兵+对内清洗阉党线；若延迟辽饷+冷待东林，则阉党权势强化、客氏与魏权争激化，后期被迫向东林妥协，但已失手筹控权的机窗。'
};

const fs = require('fs');
fs.writeFileSync('C:/Users/37814/Desktop/tianming/_llmbridge_resp_1.json', JSON.stringify({
  seq: 1,
  message: {
    role: 'assistant',
    content: JSON.stringify(events)
  },
  finish_reason: 'stop'
}));

console.log('done 1');
