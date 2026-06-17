// M4 codemod — 补 26 个字段中文标签 + 折子 textarea 行标 folio-row-wide（两栏布局用）。
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

// 1) FIELD_DESCRIPTIONS 补 26 条（插在对象开头）
const DESC_ANCHOR = '  var FIELD_DESCRIPTIONS = {\n';
const NEW_DESCS =
  "    'tags': '标签 · 剧本检索与分类用关键词',\n" +
  "    'refFiles': '参考文件 · 创作时引用的素材清单',\n" +
  "    'openingText': '开场正文 · 进入剧本时的开篇文本',\n" +
  "    'startLocation': '起始地点 · 玩家开局所在地',\n" +
  "    'scnStyle': '剧本风格 · 叙事基调与演绎风格',\n" +
  "    'scnStyleRule': '风格规则 · 约束 AI 叙事的风格条款',\n" +
  "    'refFilesContent': '参考文件内容 · 素材正文缓存',\n" +
  "    'refText': '参考文本 · 附加的背景参考资料',\n" +
  "    'masterScript': '主控脚本 · 剧本级总控逻辑',\n" +
  "    'isFullyDetailed': '是否完整细化 · 标记剧本是否已精修完成',\n" +
  "    'schemeConfig': '谋略配置 · 权谋与算计玩法参数',\n" +
  "    'initialEnYuan': '初始恩怨 · 人物间预设的恩仇网络',\n" +
  "    'initialPatronNetwork': '初始举荐网络 · 门生故吏与庇荫关系',\n" +
  "    'externalForces': '外部势力 · 域外与边外的非朝廷力量',\n" +
  "    'diplomacyConfig': '外交配置 · 邦交与外交规则',\n" +
  "    'tinyi': '廷议配置 · 朝堂集议机制',\n" +
  "    'officeConfig': '官制配置 · 职官体系细则',\n" +
  "    'authorityConfigDeep': '皇权进阶配置 · 权威机制深层参数',\n" +
  "    'neitang_advanced': '内廷进阶 · 内廷与内库进阶设置',\n" +
  "    'guoku_advanced': '国库进阶 · 财政国库进阶设置',\n" +
  "    'eventConstraints': '事件约束 · 事件触发的限制条件',\n" +
  "    'chronicleConfig': '编年配置 · 史册与编年体记录设置',\n" +
  "    'engineConstants': '引擎常量 · 底层数值常量',\n" +
  "    'imperialEdicts': '诏令库 · 可下达的圣旨与诏令',\n" +
  "    'edictConfig': '诏令配置 · 诏令系统规则',\n" +
  "    'decisionConfig': '决策配置 · 玩家决断机制设置',\n";
replaceOnce(DESC_ANCHOR, DESC_ANCHOR + NEW_DESCS, 'descs');

// 2) renderFolioRow：标量最终行按 control 是否含 folio-textarea 加 folio-row-wide
const RET_ANCHOR =
  "    return '<div class=\"folio-row\" data-folio-row=\"' + escapeHtml(field) + '\">' + head +\n" +
  "      '<div class=\"folio-control\">' + control + aiBtn + '</div></div>';";
const RET_NEW =
  "    var rowCls = control.indexOf('folio-textarea') >= 0 ? 'folio-row folio-row-wide' : 'folio-row';\n" +
  "    return '<div class=\"' + rowCls + '\" data-folio-row=\"' + escapeHtml(field) + '\">' + head +\n" +
  "      '<div class=\"folio-control\">' + control + aiBtn + '</div></div>';";
replaceOnce(RET_ANCHOR, RET_NEW, 'wide-class');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta bytes:', s.length - orig.length);
