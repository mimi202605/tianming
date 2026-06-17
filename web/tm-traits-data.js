// @ts-check
// ============================================================
// 特质库（Personality Traits Library）
// 数据源：CK3 1.18 Wiki + 用户补充
// 本库供剧本编辑器选择+AI生成+游戏推演三端共享
// ============================================================

// 类别定义
var TRAIT_CATEGORIES = {
  personality: { label: '个性', desc: '核心性格——影响AI行为决策', color: '#ffd700' },
  education:   { label: '教育', desc: '教育背景——五围主属性+经验加成', color: '#9b59b6' },
  lifestyle:   { label: '生活方式', desc: '人生选择——长期加成', color: '#16a085' },
  commander:   { label: '将领', desc: '统兵才能——战场特效', color: '#e74c3c' },
  role:        { label: '角色', desc: '身份/宗教/血统', color: '#3498db' },
  body:        { label: '体质', desc: '身体禀赋', color: '#d4a04c' },
  health:      { label: '健康', desc: '健康状态', color: '#c0392b' },
  stress:      { label: '压力', desc: '压力应对', color: '#7f8c8d' },
  child:       { label: '幼时', desc: '童年性格', color: '#66bb6a' }
};

// ── 特质库（完整表）──
// 字段：id/name/category/group/opposites[]/effects{五围}/behaviorTendency/aiHints/stressFromAction/stressReleaseBy/description
var TRAIT_LIBRARY = {
  // ═══════════ 个性特质（核心） ═══════════
  brave:       { id:'brave', name:'勇敢', category:'personality', group:'g_brave_craven', opposites:['craven'],
                 effects:{ military:+2, valor:+3 },
                 behaviorTendency:'战场冲锋在前；危机中倾向硬刚；不畏被俘阵亡；不愿屈服于恐吓',
                 aiHints:{ boldness:+200, energy:+20, social:+20, rationality:-20 },
                 stressReleaseBy:['hunting','battle'], description:'军事+2 勇武+3' },
  craven:      { id:'craven', name:'怯懦', category:'personality', group:'g_brave_craven', opposites:['brave'],
                 effects:{ military:-2, valor:-3 },
                 behaviorTendency:'避战畏敌；倾向阴谋暗害；易屈服于威吓；战死概率低但荣誉差',
                 aiHints:{ boldness:-200, energy:-20, social:-20, rationality:+10 },
                 stressFromAction:['torture'], description:'军事-2 勇武-3' },

  calm:        { id:'calm', name:'冷静', category:'personality', group:'g_calm_wrath', opposites:['wrathful'],
                 effects:{ diplomacy:+1, intelligence:+1 },
                 behaviorTendency:'临危不乱；不易被激怒；审慎决策；发现阴谋概率高',
                 aiHints:{ rationality:+75, energy:-10, vengefulness:-10 },
                 stressReleaseBy:['meditate'], description:'外交+1 智力+1 减压+10%' },
  wrathful:    { id:'wrathful', name:'暴怒', category:'personality', group:'g_calm_wrath', opposites:['calm'],
                 effects:{ diplomacy:-1, military:+3, intelligence:-1 },
                 behaviorTendency:'易激怒；暴怒下乱下决定；恐怖值自然高；喜惩罚罪人',
                 aiHints:{ boldness:+35, vengefulness:+20, rationality:-35 },
                 description:'外交-1 军事+3 智力-1' },

  chaste:      { id:'chaste', name:'贞洁', category:'personality', group:'g_chaste_lust', opposites:['lustful'],
                 effects:{ intelligence:+2 },
                 behaviorTendency:'拒绝勾引；生育率低；克制欲望；多独身',
                 aiHints:{ honor:+20, energy:+10, zeal:+10, greed:-20, social:-20 },
                 description:'智力+2 生育力-25%' },
  lustful:     { id:'lustful', name:'色欲', category:'personality', group:'g_chaste_lust', opposites:['chaste'],
                 effects:{ intelligence:+2, ambition:+1 },
                 behaviorTendency:'易被勾引；纳妾多；生育率高；影响决策',
                 aiHints:{ social:+35, greed:+20, energy:+10, honor:-10 },
                 description:'谋略+2 生育力+25%' },

  content:     { id:'content', name:'安于现状', category:'personality', group:'g_content_ambit', opposites:['ambitious'],
                 effects:{ intelligence:+2, ambition:-2 },
                 behaviorTendency:'满足当前；不觊觎上位；领主好感高；稳健保守',
                 aiHints:{ honor:+10, boldness:-35, energy:-35, greed:-50 },
                 stressFromAction:['claim_throne','execute_innocent'],
                 description:'智力+2 减压+10% 对领主好感+20' },
  ambitious:   { id:'ambitious', name:'野心勃勃', category:'personality', group:'g_content_ambit', opposites:['content'],
                 effects:{ loyalty:-1, ambition:+3, administration:+1, management:+1, military:+1, intelligence:+1, valor:+1 },
                 behaviorTendency:'觊觎更高位；倾向颠覆宗主；压力易积；图权夺位',
                 aiHints:{ energy:+75, greed:+75, boldness:+50, honor:-20 },
                 description:'五围+1 勇武+1 对领主好感-15' },

  diligent:    { id:'diligent', name:'勤奋', category:'personality', group:'g_dilig_lazy', opposites:['lazy'],
                 effects:{ diplomacy:+1, intelligence:+1, administration:+1, management:+1, military:+1 },
                 behaviorTendency:'事必躬亲；不断处理政务；压力难消；解决问题效率高',
                 aiHints:{ energy:+75, boldness:+35, rationality:+20 },
                 stressReleaseBy:['hunting'], description:'五围+1 减压-50%' },
  lazy:        { id:'lazy', name:'懒惰', category:'personality', group:'g_dilig_lazy', opposites:['diligent'],
                 effects:{ diplomacy:-1, intelligence:-1, administration:-1, management:-1, military:-1 },
                 behaviorTendency:'懒于处理；推诿决策；易享乐；政务效率低',
                 aiHints:{ greed:+10, energy:-50, social:-10, compassion:-10 },
                 description:'五围-1 减压+50%' },

  honest:      { id:'honest', name:'诚实', category:'personality', group:'g_honest_decei', opposites:['deceitful'],
                 effects:{ diplomacy:+2, intelligence:-4 },
                 behaviorTendency:'守信无诈；厌恶欺骗；敲诈会压力；暴露秘密反能减压',
                 aiHints:{ honor:+50, social:+20, boldness:+10, compassion:+10 },
                 description:'外交+2 谋略-4' },
  deceitful:   { id:'deceitful', name:'狡诈', category:'personality', group:'g_honest_decei', opposites:['honest'],
                 effects:{ diplomacy:-2, intelligence:+4 },
                 behaviorTendency:'善阴谋；惯于欺骗；使阴招；可教"计谋艺术"',
                 aiHints:{ rationality:+10, compassion:-10, honor:-50 },
                 description:'外交-2 谋略+4' },

  generous:    { id:'generous', name:'慷慨', category:'personality', group:'g_gen_greed', opposites:['greedy'],
                 effects:{ diplomacy:+3, benevolence:+1 },
                 behaviorTendency:'喜施恩；散财笼络人心；收入低；赠金可减压',
                 aiHints:{ compassion:+35, honor:+20, social:+10, greed:-200 },
                 stressFromAction:['demand_money'], stressReleaseBy:['gift_money'],
                 description:'外交+3 每月收入-10%' },
  greedy:      { id:'greedy', name:'贪婪', category:'personality', group:'g_gen_greed', opposites:['generous'],
                 effects:{ diplomacy:-2, benevolence:-2, management:+1 },
                 behaviorTendency:'敛财无度；易受贿；压力时更贪；抗拒慷慨施赠',
                 aiHints:{ greed:+200, honor:-10, compassion:-20 },
                 stressFromAction:['gift_money','grant_title'], stressReleaseBy:['extra_tax'],
                 description:'外交-2 管理+1 每月收入+5%' },

  gregarious:  { id:'gregarious', name:'合群', category:'personality', group:'g_greg_shy', opposites:['shy'],
                 effects:{ diplomacy:+2, charisma:+1 },
                 behaviorTendency:'喜社交；办宴会；交际广；拉拢人才效率高',
                 aiHints:{ social:+200, compassion:+35, boldness:+20 },
                 stressReleaseBy:['banquet'], description:'外交+2 每月影响力+0.10' },
  shy:         { id:'shy', name:'害羞', category:'personality', group:'g_greg_shy', opposites:['gregarious'],
                 effects:{ diplomacy:-2, intelligence:+1 },
                 behaviorTendency:'避社交；不善言辞；少树敌；学习慢',
                 aiHints:{ social:-200, boldness:-20 },
                 description:'外交-2 智力+1 吸引力好感-5' },

  humble:      { id:'humble', name:'谦卑', category:'personality', group:'g_humb_arrog', opposites:['arrogant'],
                 effects:{ benevolence:+1 },
                 behaviorTendency:'不夸耀；厚待下属；主动谢罪；神职者爱戴',
                 aiHints:{ compassion:+20, honor:+20, greed:-50 },
                 description:'每月虔诚+0.5 领主/封臣好感+10' },
  arrogant:    { id:'arrogant', name:'傲慢', category:'personality', group:'g_humb_arrog', opposites:['humble'],
                 effects:{ benevolence:-2, charisma:+1 },
                 behaviorTendency:'轻视他人；不纳谏；羞辱臣僚；威望增速高',
                 aiHints:{ boldness:+35, greed:+20, social:+20, honor:-20 },
                 stressFromAction:['grant_independence','legitimize_bastard'],
                 description:'每月威望+1 对领主/封臣好感-5' },

  just:        { id:'just', name:'公正', category:'personality', group:'g_just_arbit', opposites:['arbitrary'],
                 effects:{ administration:+2, intelligence:+1, management:+1 },
                 behaviorTendency:'赏罚分明；按律断案；绝不私刑；正统性高',
                 aiHints:{ honor:+200, rationality:+20, vengefulness:+10, zeal:+10 },
                 stressFromAction:['blackmail','execute_prisoner'],
                 description:'治政+2 智力+1 管理+1' },
  arbitrary:   { id:'arbitrary', name:'专断', category:'personality', group:'g_just_arbit', opposites:['just'],
                 effects:{ administration:-2, management:-2, intelligence:+3 },
                 behaviorTendency:'随心所欲；法外用刑；专断逮捕；自然恐怖值高',
                 aiHints:{ boldness:+10, compassion:-10, rationality:-20, honor:-200 },
                 description:'治政-2 管理-2 谋略+3 自然恐怖值+15' },

  patient:     { id:'patient', name:'耐心', category:'personality', group:'g_pat_impat', opposites:['impatient'],
                 effects:{ intelligence:+2 },
                 behaviorTendency:'深谋远虑；不急于求成；计谋阻力强；领主好感+',
                 aiHints:{ rationality:+35, vengefulness:+10, boldness:-20 },
                 description:'智力+2 领主好感+5' },
  impatient:   { id:'impatient', name:'急躁', category:'personality', group:'g_pat_impat', opposites:['patient'],
                 effects:{ intelligence:-2 },
                 behaviorTendency:'急于求成；加速计谋；旅行快但危险；树敌',
                 aiHints:{ boldness:+20, energy:+10, rationality:-35 },
                 description:'智力-2 每月威望+20%' },

  temperate:   { id:'temperate', name:'节制', category:'personality', group:'g_temp_glut', opposites:['gluttonous'],
                 effects:{ administration:+1, management:+2 },
                 behaviorTendency:'自律有节；少沉溺；健康更好；不易被毒杀',
                 aiHints:{ energy:+10, greed:-35 },
                 description:'治政+1 管理+2 健康+0.25' },
  gluttonous:  { id:'gluttonous', name:'暴食', category:'personality', group:'g_temp_glut', opposites:['temperate'],
                 effects:{ administration:-1, management:-2, charisma:-1 },
                 behaviorTendency:'饮食无度；肥胖；易被下毒但不易致死；减压+',
                 aiHints:{ greed:+35, energy:-10 },
                 description:'治政-1 管理-2 魅力-1 减压+10%' },

  trusting:    { id:'trusting', name:'轻信', category:'personality', group:'g_trust_parano', opposites:['paranoid'],
                 effects:{ diplomacy:+2, intelligence:-2 },
                 behaviorTendency:'轻信他人；不设防；易受骗；敌方计谋成功率+',
                 aiHints:{ honor:+35, social:+35, compassion:+20, rationality:-20 },
                 stressFromAction:['blackmail','execute_innocent'],
                 description:'外交+2 智力-2 敌方计谋成功率+15%' },
  paranoid:    { id:'paranoid', name:'多疑', category:'personality', group:'g_trust_parano', opposites:['trusting'],
                 effects:{ diplomacy:-1, intelligence:+3 },
                 behaviorTendency:'处处设防；疑心忠仆；计谋发现率高；极易积压',
                 aiHints:{ vengefulness:+20, compassion:-10, honor:-20, rationality:-20, social:-35 },
                 stressFromAction:['invite_court','join_plot'],
                 description:'外交-1 智力+3 压力获取+100%' },

  zealous:     { id:'zealous', name:'狂热', category:'personality', group:'g_zeal_cynic', opposites:['cynical'],
                 effects:{ military:+2, benevolence:+1 },
                 behaviorTendency:'宗教虔诚；处死异教徒；改信困难；神职者爱戴',
                 aiHints:{ zeal:+200, energy:+20, rationality:-20 },
                 stressReleaseBy:['execute_heretic'],
                 description:'军事+2 每月虔诚+20%' },
  cynical:     { id:'cynical', name:'愤世嫉俗', category:'personality', group:'g_zeal_cynic', opposites:['zealous'],
                 effects:{ intelligence:+2, administration:+1 },
                 behaviorTendency:'讥讽虔诚；不信神佛；改信易；轻视神职',
                 aiHints:{ rationality:+35, compassion:-10, energy:-20, zeal:-200 },
                 description:'智力+2 治政+1 每月虔诚-20%' },

  forgiving:   { id:'forgiving', name:'宽宏', category:'personality', group:'g_forgive_veng', opposites:['vengeful'],
                 effects:{ diplomacy:+2, intelligence:+1, benevolence:+2 },
                 behaviorTendency:'原谅敌人；赦免囚犯；不计前嫌；少数派爱戴',
                 aiHints:{ compassion:+35, honor:+20, rationality:+10, vengefulness:-200 },
                 stressFromAction:['imprison','murder','revoke_title','torture'],
                 description:'外交+2 智力+1 仁德+2 囚犯好感+15' },
  vengeful:    { id:'vengeful', name:'睚眦必报', category:'personality', group:'g_forgive_veng', opposites:['forgiving'],
                 effects:{ diplomacy:-2, intelligence:+2, valor:+2, benevolence:-1 },
                 behaviorTendency:'必报旧仇；不忘恩怨；对宿敌阴谋+；处决宿敌减压',
                 aiHints:{ vengefulness:+200, energy:+10, honor:-10, compassion:-20 },
                 stressReleaseBy:['execute_rival','murder_rival'],
                 description:'外交-2 智力+2 勇武+2 恐怖值+15%' },

  // 三向互斥组
  compassionate:{ id:'compassionate', name:'同情心', category:'personality', group:'g_comp_call_sad', opposites:['callous','sadistic'],
                 effects:{ diplomacy:+2, intelligence:-2, benevolence:+3 },
                 behaviorTendency:'见不得苦难；收养孤儿；回避残酷手段；恐怖值衰减快',
                 aiHints:{ compassion:+200, honor:+35, social:+35, greed:-20 },
                 stressFromAction:['execute','torture','imprison','murder','kidnap'],
                 description:'外交+2 智力-2 仁德+3 自然恐怖值-15' },
  callous:     { id:'callous', name:'冷酷', category:'personality', group:'g_comp_call_sad', opposites:['compassionate','sadistic'],
                 effects:{ diplomacy:-2, intelligence:+2, benevolence:-2 },
                 behaviorTendency:'麻木不仁；不怜他人苦；恐怖值获取+；放囚犯会压力',
                 aiHints:{ rationality:+10, social:-10, honor:-35, compassion:-200 },
                 description:'外交-2 智力+2 仁德-2 恐怖值获取+25%' },
  sadistic:    { id:'sadistic', name:'虐待狂', category:'personality', group:'g_comp_call_sad', opposites:['compassionate','callous'],
                 effects:{ intelligence:+2, valor:+4, benevolence:-3 },
                 behaviorTendency:'以折磨人为乐；可对子女用阴谋；自然恐怖值+35',
                 aiHints:{ honor:-75, compassion:-200 },
                 stressReleaseBy:['execute','murder','torture'],
                 description:'智力+2 勇武+4 仁德-3 自然恐怖值+35' },

  // 其他互斥
  stubborn:    { id:'stubborn', name:'固执', category:'personality', group:'g_stub_fick', opposites:['fickle'],
                 effects:{ administration:+3, management:+1 },
                 behaviorTendency:'决策不变；抗拒劝说；健康好；与他人冲突多',
                 aiHints:{ honor:+35, vengefulness:+35, rationality:-10 },
                 description:'治政+3 管理+1 健康+0.25' },
  fickle:      { id:'fickle', name:'多变', category:'personality', group:'g_stub_fick', opposites:['stubborn'],
                 effects:{ diplomacy:+2, administration:-2, management:-2, intelligence:+1 },
                 behaviorTendency:'朝三暮四；决策反复；敌方阴谋难推进',
                 aiHints:{ boldness:+20, honor:-20, rationality:-20, vengefulness:-20 },
                 description:'外交+2 治政-2 管理-2 智力+1' },
  eccentric:   { id:'eccentric', name:'古怪', category:'personality', group:'g_eccen', opposites:[],
                 effects:{ diplomacy:-2, intelligence:+2 },
                 behaviorTendency:'行事离奇；不可预测；每月生活方式经验+',
                 aiHints:{ boldness:+75, honor:-20, social:-20, rationality:-200 },
                 description:'外交-2 智力+2 压力获取+50% 失去+50%' },

  // ═══════════ 教育特质（四级精通） ═══════════
  edu_diplomacy_4: { id:'edu_diplomacy_4', name:'幕后操控人', category:'education', group:'g_edu_dip', opposites:[],
                    effects:{ diplomacy:+8 },
                    behaviorTendency:'外交天才；结盟拉拢高效；每月外交经验+40%',
                    description:'外交+8' },
  edu_intrigue_4:  { id:'edu_intrigue_4', name:'难以捉摸的影子', category:'education', group:'g_edu_int', opposites:[],
                    effects:{ intelligence:+8 },
                    behaviorTendency:'阴谋大师；暗中操作；每月谋略经验+40%',
                    description:'谋略+8' },
  edu_stewardship_4:{ id:'edu_stewardship_4', name:'点石成金者', category:'education', group:'g_edu_stew', opposites:[],
                    effects:{ management:+8, administration:+3 },
                    behaviorTendency:'理财圣手；开源节流无出其右；每月管理经验+40%',
                    description:'管理+8 治政+3' },
  edu_martial_4:   { id:'edu_martial_4', name:'天才军事家', category:'education', group:'g_edu_mar', opposites:[],
                    effects:{ military:+8 },
                    behaviorTendency:'百战名将；用兵如神；每月军事经验+40%',
                    description:'军事+8' },
  edu_learning_4:  { id:'edu_learning_4', name:'哲学大师', category:'education', group:'g_edu_lea', opposites:[],
                    effects:{ intelligence:+8 },
                    behaviorTendency:'博学通儒；精通经史子集；每月学识经验+40%',
                    description:'智力+8' },

  // ═══════════ 生活方式特质 ═══════════
  diplomat_ls:   { id:'diplomat_ls', name:'外交家', category:'lifestyle', effects:{ diplomacy:+3 },
                   behaviorTendency:'善于缔结联盟；独立统治者好感+20；私人计谋强度+25%',
                   description:'外交+3 独立统治者好感+20' },
  family_first:  { id:'family_first', name:'顾家男人', category:'lifestyle', effects:{ charisma:+1, benevolence:+2 },
                   behaviorTendency:'重视家族；至亲好感高；减压+20%；生育力+20%',
                   description:'生育力+20% 至亲好感+15' },
  august:        { id:'august', name:'奥古斯都', category:'lifestyle', effects:{ diplomacy:+2, military:+1 },
                   behaviorTendency:'威严赫赫；每月威望+1',
                   description:'外交+2 军事+1 威望+1/月' },
  strategist:    { id:'strategist', name:'军事家', category:'lifestyle', effects:{ diplomacy:+1, military:+3 },
                   behaviorTendency:'精研兵法；战术敏锐；敌军死亡+25%',
                   description:'外交+1 军事+3' },
  overseer:      { id:'overseer', name:'监督者', category:'lifestyle', effects:{ military:+2, administration:+2 },
                   behaviorTendency:'督办严苛；控制力增长+50%/月',
                   description:'军事+2 治政+2' },
  gallant:       { id:'gallant', name:'侠义骑士', category:'lifestyle', effects:{ military:+2, valor:+4 },
                   behaviorTendency:'重义轻生；每月威望+20%；吸引好感+20',
                   description:'军事+2 勇武+4' },
  architect:     { id:'architect', name:'建筑家', category:'lifestyle', effects:{ administration:+2, management:+2 },
                   behaviorTendency:'擅长营造；建造时间-15%；花费-10%',
                   description:'治政+2 管理+2' },
  administrator_ls:{ id:'administrator_ls', name:'行政家', category:'lifestyle', effects:{ diplomacy:+1, administration:+3 },
                   behaviorTendency:'行政高效；封臣好感+5',
                   description:'外交+1 治政+3' },
  avaricious:    { id:'avaricious', name:'爱财如命', category:'lifestyle', effects:{ management:+2, benevolence:-1 },
                   behaviorTendency:'每事算利；地产税收+15%',
                   description:'管理+2 地产税收+15%' },
  schemer:       { id:'schemer', name:'阴谋家', category:'lifestyle', effects:{ intelligence:+5 },
                   behaviorTendency:'阴谋大师；阴谋强度+25%',
                   description:'智力+5 阴谋强度+25%' },
  seducer:       { id:'seducer', name:'勾引者', category:'lifestyle', effects:{ intelligence:+3, charisma:+2 },
                   behaviorTendency:'勾引高手；生育力+20%；吸引好感+40',
                   description:'智力+3 魅力+2' },
  torturer:      { id:'torturer', name:'拷打者', category:'lifestyle', effects:{ valor:+4, benevolence:-2 },
                   behaviorTendency:'擅刑讯；恐怖值+50%；阴谋阻力+25%',
                   description:'勇武+4 仁德-2' },
  scholar:       { id:'scholar', name:'学者', category:'lifestyle', effects:{ intelligence:+5 },
                   behaviorTendency:'学问渊深；阴谋成功率+10；发展度+15%/月',
                   description:'智力+5' },
  theologian:    { id:'theologian', name:'神学家', category:'lifestyle', effects:{ intelligence:+3, benevolence:+1 },
                   behaviorTendency:'精通神学；每月虔诚+20%',
                   description:'智力+3 仁德+1' },
  hunter_3:      { id:'hunter_3', name:'狩猎大师', category:'lifestyle', effects:{ valor:+6 },
                   behaviorTendency:'狩猎高手；减压+20%',
                   description:'勇武+6' },
  mystic_3:      { id:'mystic_3', name:'行奇迹者', category:'lifestyle', effects:{ intelligence:+4 },
                   behaviorTendency:'神秘学大师',
                   description:'智力+4' },
  physician_3:   { id:'physician_3', name:'著名医师', category:'lifestyle', effects:{ intelligence:+4 },
                   behaviorTendency:'医术高明；健康增益',
                   description:'智力+4' },
  blademaster_3: { id:'blademaster_3', name:'传奇剑圣', category:'lifestyle', effects:{ valor:+12 },
                   behaviorTendency:'剑术冠绝当世；健康大益',
                   description:'勇武+12' },
  reveler_3:     { id:'reveler_3', name:'狂欢者', category:'lifestyle', effects:{ diplomacy:+4, intelligence:+3 },
                   behaviorTendency:'宴饮狂欢高手',
                   description:'外交+4 智力+3' },
  herbalist:     { id:'herbalist', name:'药草师', category:'lifestyle', effects:{ intelligence:+2 },
                   behaviorTendency:'医药专家；健康中增',
                   description:'智力+2' },
  prowess_4:     { id:'prowess_4', name:'著名的勇士', category:'lifestyle', effects:{ valor:+4 },
                   behaviorTendency:'武名远播',
                   description:'勇武+4' },

  // ═══════════ 将领特质 ═══════════
  logistician:      { id:'logistician', name:'后勤专家', category:'commander',
                      behaviorTendency:'补给持续期间+100%——长线远征不虞后勤', description:'补给+100%' },
  military_engineer:{ id:'military_engineer', name:'军事工程师', category:'commander',
                      behaviorTendency:'围攻时间-30%；攻坚高效', description:'围攻-30%' },
  aggressive_attacker:{ id:'aggressive_attacker', name:'激进进攻者', category:'commander',
                      behaviorTendency:'进攻猛烈；敌方死亡+25%', description:'进攻+25%' },
  unyielding_defender:{ id:'unyielding_defender', name:'不屈防御者', category:'commander',
                      behaviorTendency:'死守到底；己方减员-25%', description:'防御+25%' },
  forder:           { id:'forder', name:'涉水者', category:'commander',
                      behaviorTendency:'渡水无惩罚', description:'渡水+' },
  flexible_leader:  { id:'flexible_leader', name:'灵活将领', category:'commander',
                      behaviorTendency:'敌方防御优势-50%', description:'机动' },
  reaver:           { id:'reaver', name:'掠夺者', category:'commander',
                      behaviorTendency:'劫掠速度+100%；敌方领土损耗-75%', description:'掠夺+' },
  reckless:         { id:'reckless', name:'鲁莽将领', category:'commander',
                      behaviorTendency:'战斗骰波动大；最小-4 最大+6', description:'骰高' },
  cautious_leader:  { id:'cautious_leader', name:'谨慎将领', category:'commander',
                      behaviorTendency:'战斗骰稳定；最小+4 最大-2', description:'骰稳' },
  organizer:        { id:'organizer', name:'组织者', category:'commander',
                      behaviorTendency:'行军+25%；撤退损失-20%', description:'机动' },
  holy_warrior:     { id:'holy_warrior', name:'神圣武士', category:'commander', effects:{ military:+1 },
                      behaviorTendency:'信仰敌对度优势+10', description:'信仰战+' },

  // ═══════════ 压力特质 ═══════════
  rakish:     { id:'rakish', name:'放荡', category:'stress', effects:{ diplomacy:-1, intelligence:+1 },
                behaviorTendency:'放浪形骸；减压+20%；吸引好感-5', description:'减压' },
  irritable:  { id:'irritable', name:'烦躁', category:'stress', effects:{ diplomacy:-2, military:-1, valor:+2 },
                behaviorTendency:'易怒；减压+20%；恐怖值+10%', description:'易怒' },
  profligate: { id:'profligate', name:'挥霍', category:'stress', effects:{ management:-2 },
                behaviorTendency:'浪费无度；月收入-10%', description:'浪费' },
  improvident:{ id:'improvident', name:'缺乏远见', category:'stress', effects:{ diplomacy:+1, management:-2 },
                behaviorTendency:'短视；月收入-15%', description:'短视' },
  journaller: { id:'journaller', name:'写日记者', category:'stress', effects:{ intelligence:+1 },
                behaviorTendency:'倾诉于纸笔；减压+20%', description:'减压' },
  confider:   { id:'confider', name:'倾诉者', category:'stress', effects:{ diplomacy:+1 },
                behaviorTendency:'有知己；减压+20%', description:'减压' },
  athletic:   { id:'athletic', name:'运动', category:'stress', effects:{ valor:+1 },
                behaviorTendency:'习武健身；减压+20%', description:'减压' },
  deviant:    { id:'deviant', name:'变态', category:'stress', effects:{ benevolence:-2 },
                behaviorTendency:'另类嗜好；减压+25%；吸引好感-', description:'减压' },

  // ═══════════ 健康特质 ═══════════
  depressed:  { id:'depressed', name:'抑郁症', category:'health', effects:{ diplomacy:-1, military:-1, administration:-1, management:-1, intelligence:-1 },
                behaviorTendency:'情绪低落；生育-10%；需要人心照料',
                description:'五围-1' },
  lunatic:    { id:'lunatic', name:'精神错乱', category:'health', effects:{ charisma:-3 },
                behaviorTendency:'神志不清；言行怪诞；封臣好感-10',
                description:'吸引好感-10 封臣好感-10' },
  possessed:  { id:'possessed', name:'附身', category:'health', effects:{ charisma:-2 },
                behaviorTendency:'如被鬼附；言行异常；学识生活方式经验+10%',
                description:'吸引好感-10' },
  scarred:    { id:'scarred', name:'伤疤', category:'health', effects:{ charisma:+1, valor:+1 },
                behaviorTendency:'身带战痕；威望+1/月；吸引好感+5',
                description:'威望+1/月 吸引好感+5' },

  // ═══════════ 身体特质 ═══════════
  pure_blooded:{ id:'pure_blooded', name:'纯血', category:'body',
                 behaviorTendency:'血统纯正；生育+10%；近亲繁殖-50%',
                 description:'生育+10%' },
  fecund:     { id:'fecund', name:'多产', category:'body',
                 behaviorTendency:'生育+50%；寿命+5',
                 description:'生育+50%' },
  shrewd:     { id:'shrewd', name:'精明', category:'body', effects:{ diplomacy:+1, intelligence:+1, administration:+1, management:+1, military:+1 },
                 behaviorTendency:'天生聪慧；五围+2',
                 description:'五围+2' },
  strong:     { id:'strong', name:'强壮', category:'body', effects:{ valor:+4 },
                 behaviorTendency:'体魄雄健；健康中增',
                 description:'勇武+4' },
  giant:      { id:'giant', name:'巨人', category:'body', effects:{ valor:+6, charisma:-1 },
                 behaviorTendency:'身高异常；健康中减；吸引好感-5',
                 description:'勇武+6' },
  albino:     { id:'albino', name:'白化', category:'body',
                 behaviorTendency:'血色异常；自然恐怖值+15；大众好感-10',
                 description:'恐怖+15' },

  // ═══════════ 角色/身份特质 ═══════════
  celibate:   { id:'celibate', name:'禁欲者', category:'role', effects:{ benevolence:+1 },
                behaviorTendency:'终身不娶；无法生育；神职者爱戴',
                description:'虔诚+1/月 无法生育' },
  pilgrim:    { id:'pilgrim', name:'朝圣者', category:'role',
                behaviorTendency:'曾朝圣；每月虔诚+10%',
                description:'朝圣过' },
  faith_warrior:{ id:'faith_warrior', name:'信仰勇士', category:'role', effects:{ military:+2, valor:+1 },
                  behaviorTendency:'为信仰而战；同信仰好感+15',
                  description:'军事+2 勇武+1' },
  devoted:    { id:'devoted', name:'誓愿者', category:'role', effects:{ benevolence:+1 },
                behaviorTendency:'出家修士；可能不婚不继；虔诚+0.3/月',
                description:'僧侣/修士' },
  crusader_king:{ id:'crusader_king', name:'十字军之王', category:'role', effects:{ military:+3, valor:+2 },
                  behaviorTendency:'信仰军事双强；控制力增长50%/月',
                  description:'军事+3 勇武+2' },
  greatest_of_khans:{ id:'greatest_of_khans', name:'伟大可汗', category:'role', effects:{ diplomacy:+2, military:+2, administration:+1, valor:+2 },
                     behaviorTendency:'恢宏统率；封臣上限+20',
                     description:'外交+2 军事+2 治政+1 勇武+2' },
  paragon:    { id:'paragon', name:'典范', category:'role', behaviorTendency:'宗教典范；宗教封臣好感+20', description:'楷模' },
  order_member:{ id:'order_member', name:'骑士团成员', category:'role', effects:{ military:+1, valor:+4 },
                 behaviorTendency:'誓守骑士团；可能不婚不继', description:'军事+1 勇武+4' },
  cannibal:   { id:'cannibal', name:'食人者', category:'role', effects:{ valor:+2, benevolence:-3 },
                behaviorTendency:'嗜食人肉；恐怖+20；减压+15%', description:'勇武+2 仁德-3' },
  born_in_the_purple:{ id:'born_in_the_purple', name:'生于紫室', category:'role',
                       behaviorTendency:'紫宫贵胄；威望+0.5/月；封臣好感+5', description:'皇族出身' },
  berserker:  { id:'berserker', name:'狂战士', category:'role', effects:{ diplomacy:-2, military:+2, valor:+5 },
                behaviorTendency:'战场癫狂；勇武+5；外交低', description:'狂战' },
  varangian:  { id:'varangian', name:'瓦兰吉卫士', category:'role', effects:{ diplomacy:+1, military:+2, valor:+2 },
                behaviorTendency:'精英近卫', description:'军事+2 勇武+2' },
  viking:     { id:'viking', name:'劫掠者', category:'role', effects:{ military:+2, valor:+3 },
                behaviorTendency:'海盗出身；威望+0.3/月', description:'军事+2 勇武+3' },
  adventurer: { id:'adventurer', name:'冒险家', category:'role', effects:{ diplomacy:-1, military:+1, valor:+1 },
                behaviorTendency:'游荡四海；闯荡天下', description:'勇武+1' },
  witch:      { id:'witch', name:'巫师', category:'role', effects:{ diplomacy:-1, intelligence:+2 },
                behaviorTendency:'通晓巫术；神秘危险', description:'智力+2' },
  peasant_leader:{ id:'peasant_leader', name:'农民领袖', category:'role',
                   behaviorTendency:'草根崛起；大众好感-10；公众好感+10', description:'出身草莽' },
  heresiarch: { id:'heresiarch', name:'异端头目', category:'role', effects:{ military:+2, intelligence:+2, valor:+2 },
                behaviorTendency:'异教首领；同信仰好感+10', description:'军事+2 智力+2 勇武+2' },

  // ═══════════ 幼时特质 ═══════════
  rowdy:      { id:'rowdy', name:'闹腾', category:'child', effects:{ military:+1, intelligence:+1 },
                behaviorTendency:'小孩淘气好动', description:'军事+1 智力+1' },
  charming_c: { id:'charming_c', name:'可爱', category:'child', effects:{ diplomacy:+1, intelligence:+1 },
                behaviorTendency:'招人疼爱', description:'外交+1 智力+1' },
  curious:    { id:'curious', name:'好奇', category:'child', effects:{ diplomacy:+1, intelligence:+1 },
                behaviorTendency:'求知欲强', description:'外交+1 智力+1' },
  pensive:    { id:'pensive', name:'沉思', category:'child', effects:{ administration:+1, intelligence:+1 },
                behaviorTendency:'爱深思', description:'治政+1 智力+1' },
  bossy:      { id:'bossy', name:'专横', category:'child', effects:{ military:+1, administration:+1 },
                behaviorTendency:'爱指挥他人', description:'军事+1 治政+1' }
};

// ── 辅助函数 ──

/** 检查两个特质是否冲突（互斥） */
function traitsConflict(traitA, traitB) {
  if (!traitA || !traitB || traitA === traitB) return false;
  var tA = TRAIT_LIBRARY[traitA], tB = TRAIT_LIBRARY[traitB];
  if (!tA || !tB) return false;
  // 互斥组
  if (tA.group && tB.group && tA.group === tB.group) return true;
  // opposites 列表
  if (tA.opposites && tA.opposites.indexOf(traitB) >= 0) return true;
  if (tB.opposites && tB.opposites.indexOf(traitA) >= 0) return true;
  return false;
}

/** 计算角色特质对五围/十维的净效果（叠加） */
function calcTraitEffects(traitIds) {
  var result = {};
  (traitIds || []).forEach(function(tid) {
    var t = TRAIT_LIBRARY[tid]; if (!t || !t.effects) return;
    Object.keys(t.effects).forEach(function(k) {
      result[k] = (result[k] || 0) + t.effects[k];
    });
  });
  return result;
}

/** 获取角色特质的行为倾向摘要（供AI推演注入） */
function getTraitBehaviorSummary(traitIds) {
  if (!traitIds || !traitIds.length) return '';
  var lines = [];
  traitIds.forEach(function(tid) {
    var t = TRAIT_LIBRARY[tid]; if (!t) return;
    lines.push(t.name + (t.behaviorTendency ? '——' + t.behaviorTendency : ''));
  });
  return lines.join('；');
}

/** 按类别获取特质列表 */
function getTraitsByCategory(cat) {
  var result = [];
  Object.keys(TRAIT_LIBRARY).forEach(function(id) {
    var t = TRAIT_LIBRARY[id];
    if (t.category === cat) result.push(t);
  });
  return result;
}

/** 随机选取特质（为虚构人物生成） */
function randomTraits(count, categoriesFilter) {
  count = count || 4;
  var pool = [];
  Object.keys(TRAIT_LIBRARY).forEach(function(id) {
    var t = TRAIT_LIBRARY[id];
    if (categoriesFilter && categoriesFilter.indexOf(t.category) < 0) return;
    pool.push(id);
  });
  var selected = [];
  var attempts = 0;
  while (selected.length < count && attempts < 50) {
    attempts++;
    var pick = pool[Math.floor(Math.random() * pool.length)];
    // 检查冲突
    var conflict = selected.some(function(s) { return traitsConflict(s, pick); });
    if (!conflict && selected.indexOf(pick) < 0) selected.push(pick);
  }
  return selected;
}

// 导出
if (typeof window !== 'undefined') {
  window.TRAIT_LIBRARY = TRAIT_LIBRARY;
  window.TRAIT_CATEGORIES = TRAIT_CATEGORIES;
  window.traitsConflict = traitsConflict;
  window.calcTraitEffects = calcTraitEffects;
  window.getTraitBehaviorSummary = getTraitBehaviorSummary;
  window.getTraitsByCategory = getTraitsByCategory;
  window.randomTraits = randomTraits;
}
