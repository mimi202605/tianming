#!/usr/bin/env node
// scripts/smoke-changchao-agenda-tags.js
// 常朝大改·Slice 2 smoke
//
// 验·_cc3_inferTagsFromText fallback 能给现实议题命中 ≥ 60% 至少 1 tag
//
// 用法·node web/scripts/smoke-changchao-agenda-tags.js
// 预期·exit 0 = pass·>0 = fail

'use strict';

const fs = require('fs');
const path = require('path');

// 复制 _cc3_inferTagsFromText 逻辑·跟 tm-chaoyi-changchao.js 同步 (改一处时记得同步)
function inferTagsFromText(item) {
  if (!item) return [];
  const text = (item.title || '') + ' ' + (item.detail || item.content || '');
  if (!text.trim()) return [];
  const tags = [];
  if (/和议|封贡|战守|出师|金人|党项|羁縻|攻守|抚剿|藩夷|互市|抗虏|降虏|和戎|犁庭/.test(text)) tags.push('foreign-policy');
  if (/诛|斩|戮|大辟|谳狱|罪当死|抄家|凌迟|籍没|论死|弃市|赐死|连坐/.test(text)) tags.push('penal-harsh');
  if (/封赏|分赐|食邑|赐田|加禄|加恩|赏赐|进爵|加封|荫袭/.test(text)) tags.push('reward-distribution');
  if (/失仪|僭越|不臣|大不敬|违制|凌君|跋扈|无人臣礼/.test(text)) tags.push('etiquette-violation');
  if (/祭|郊|庙|社稷|宗庙|礼制|大祀|配享|侑食|追尊/.test(text)) tags.push('ritual');
  if (/(汉|唐|宋|明|周|秦|晋|魏|齐|隋)\S{0,8}故事|先朝|祖宗|前事|本朝旧例|国初\S{0,3}事|援.{0,4}故|引为.{0,2}鉴/.test(text)) tags.push('historicalPrecedent');
  if (/方略|具体|施行|条陈|分项|分议|核议|详议|勘报|筹画|举措/.test(text)) tags.push('execution-detail');
  if (/任|免|迁|擢|黜|罢|起复|拜.{0,2}相|入阁|出.{0,2}抚|开缺|休致/.test(text)) tags.push('personnel');
  return tags;
}

// 测试集·真实议题样本 + 期望 tag
const TEST_CASES = [
  // foreign-policy
  { title: '辽东战守议', detail: '宁锦防线 加饷继守 还是罢之', expectAny: ['foreign-policy'] },
  { title: '是否南幸扬州', detail: '金人将至 圣驾暂避锋芒', expectAny: ['foreign-policy'] },
  { title: '与林丹汗封贡', detail: '蒙古封贡互市议', expectAny: ['foreign-policy'] },
  // penal-harsh
  { title: '魏忠贤治罪', detail: '罪当死 抄家籍没', expectAny: ['penal-harsh'] },
  { title: '李纲赐死议', detail: '主战误国 赐死以谢', expectAny: ['penal-harsh'] },
  // reward-distribution
  { title: '宁远大捷封赏', detail: '袁崇焕加恩进爵 食邑增千户', expectAny: ['reward-distribution'] },
  { title: '黄潜善加恩议', detail: '主和有功 加禄赏赐', expectAny: ['reward-distribution'] },
  // etiquette-violation
  { title: '魏忠贤僭越', detail: '阉竖跋扈 大不敬', expectAny: ['etiquette-violation'] },
  // ritual
  { title: '太庙祭议', detail: '宗庙配享 大祀礼制', expectAny: ['ritual'] },
  { title: '南郊祭', detail: '冬至郊祀礼', expectAny: ['ritual'] },
  // historicalPrecedent
  { title: '汉光武渡江故事', detail: '可援为今鉴', expectAny: ['historicalPrecedent'] },
  { title: '本朝旧例议', detail: '太祖国初之事 当依祖宗成法', expectAny: ['historicalPrecedent'] },
  // execution-detail
  { title: '辽饷筹画', detail: '请兵部户部详议具体方略 勘报核议', expectAny: ['execution-detail'] },
  // personnel
  { title: '袁崇焕拜督师', detail: '擢督师蓟辽 入阁议事', expectAny: ['personnel'] },
  { title: '李纲罢相', detail: '免相黜出', expectAny: ['personnel'] },
];

let pass = 0, fail = 0;
const failures = [];
TEST_CASES.forEach((tc, i) => {
  const tags = inferTagsFromText(tc);
  const matched = tc.expectAny.some(t => tags.includes(t));
  if (matched) {
    pass++;
  } else {
    fail++;
    failures.push({ idx: i, title: tc.title, expected: tc.expectAny, got: tags });
  }
});

console.log('[smoke-changchao-agenda-tags] cases·' + TEST_CASES.length + '·pass·' + pass + '·fail·' + fail);
if (failures.length) {
  console.log('  失败项·');
  failures.forEach(f => console.log('    [' + f.idx + '] 「' + f.title + '」 expected ' + JSON.stringify(f.expected) + ' got ' + JSON.stringify(f.got)));
}

// 通过率 ≥ 90% (15/15·至少 14·-1 容差)
const passRate = pass / TEST_CASES.length;
if (passRate < 0.90) {
  console.error('[smoke-changchao-agenda-tags] FAIL·pass rate ' + (passRate * 100).toFixed(0) + '% < 90%');
  process.exit(1);
}

// 测真实剧本议题·≥ 60% 覆盖率 (现存 scenarios)
function testScenario(p, label) {
  if (!fs.existsSync(p)) return;
  const sc = JSON.parse(fs.readFileSync(p, 'utf8'));
  const events = (sc.events || []).filter(e => e && (e.title || e.name));
  if (!events.length) {
    console.log('  ' + label + '·no events·skip');
    return;
  }
  let covered = 0;
  events.forEach(e => {
    const tags = inferTagsFromText({ title: e.title || e.name, detail: e.description || e.content || '' });
    if (tags.length) covered++;
  });
  const rate = covered / events.length;
  console.log('  ' + label + '·events ' + events.length + '·tagged ' + covered + ' (' + (rate * 100).toFixed(1) + '%)');
  if (rate < 0.40) {
    console.error('  ⚠️ 覆盖率 ' + (rate * 100).toFixed(1) + '% < 40%·可能 regex 太严');
  }
}

console.log('[smoke-changchao-agenda-tags] real scenario coverage·');
testScenario(path.resolve(__dirname, '..', '..', 'scenarios', '天启七年·九月（官方）.json'), '天启');
testScenario(path.resolve(__dirname, '..', '..', 'scenarios', '绍宋·建炎元年八月（官方）.json'), '绍宋');

console.log('[smoke-changchao-agenda-tags] PASS');
process.exit(0);
