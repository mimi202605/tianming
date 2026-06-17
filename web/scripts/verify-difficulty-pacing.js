#!/usr/bin/env node
/* eslint-env node */
'use strict';
// 难度归一 + 黑天鹅(叙事节奏撺掇)闸·判定逻辑核对·2026-05-30
// 与 tm-endturn-prompt.js 内 _DIFF_NORM 映射 + 6.6 张力建议闸 逐字一致：
//   ①难度值域归一(英文 narrative/standard/hardcore + 中文 简单/普通/中等/困难/地狱 → 一套·未知→standard)
//   ②黑天鹅闸：太平(_allLow)时只有 hardcore 才撺掇"制造冲突/转折"；narrative 给"勿无故降祸"；standard 静默(不撺)。给喘息(_allHigh)所有档都留。
var passed = 0;
function assert(c, l) { if (!c) throw new Error('[assert] ' + l); passed += 1; }

function diffNorm(d) {
  var M = { narrative: 'narrative', standard: 'standard', hardcore: 'hardcore',
    '简单': 'narrative', '叙事': 'narrative', '普通': 'standard', '中等': 'standard', '标准': 'standard', '困难': 'hardcore', '地狱': 'hardcore', '硬核': 'hardcore' };
  return M[d] || 'standard';
}
function pacing(allLow, allHigh, dn) {
  var out = [];
  if (allLow && dn === 'hardcore') out.push('撺掇转折');
  else if (allLow && dn === 'narrative') out.push('勿降祸');
  if (allHigh) out.push('喘息');
  return out;
}

// ① 值域归一
assert(diffNorm('narrative') === 'narrative' && diffNorm('standard') === 'standard' && diffNorm('hardcore') === 'hardcore', '①英文档恒等');
assert(diffNorm('简单') === 'narrative', '①简单→narrative·实得 ' + diffNorm('简单'));
assert(diffNorm('普通') === 'standard' && diffNorm('中等') === 'standard', '①普通/中等→standard');
assert(diffNorm('困难') === 'hardcore' && diffNorm('地狱') === 'hardcore', '①困难/地狱→hardcore');
assert(diffNorm(undefined) === 'standard' && diffNorm('乱填的值') === 'standard', '①未知/未设→默认 standard(不会取不到难度提示词)');
console.log('  ① 值域归一: 中英文两套→narrative/standard/hardcore 一套·未知兜 standard');

// ② 黑天鹅闸
assert(JSON.stringify(pacing(true, false, 'hardcore')) === JSON.stringify(['撺掇转折']), '②太平+硬核→撺掇转折(只此档)·实得 ' + JSON.stringify(pacing(true, false, 'hardcore')));
assert(JSON.stringify(pacing(true, false, 'narrative')) === JSON.stringify(['勿降祸']), '②太平+叙事→勿无故降祸(治E.B所向披靡爽感)·实得 ' + JSON.stringify(pacing(true, false, 'narrative')));
assert(JSON.stringify(pacing(true, false, 'standard')) === JSON.stringify([]), '②太平+标准→静默·不再撺掇黑天鹅(E.B轻度史实/中等档不再被强行降祸)·实得 ' + JSON.stringify(pacing(true, false, 'standard')));
assert(pacing(true, false, 'standard').indexOf('撺掇转折') < 0 && pacing(true, false, 'narrative').indexOf('撺掇转折') < 0, '②关键:非硬核档绝不撺掇制造冲突/转折');
assert(JSON.stringify(pacing(false, true, 'narrative')) === JSON.stringify(['喘息']) && JSON.stringify(pacing(false, true, 'hardcore')) === JSON.stringify(['喘息']), '②高压给喘息·所有档都留');
console.log('  ② 黑天鹅闸: 太平撺掇转折只在硬核档·叙事档反向劝"勿降祸"·标准档静默·喘息全留');

// ③ 设置面板难度选择器·旧档中文值迁移高亮（与 tm-patches.js:582 / tm-player-settings.js:257 的 selected 正则逐字一致）
function selOpt(d) {
  d = d || '';
  if (/^(narrative|简单|叙事)$/.test(d)) return 'narrative';
  if (/^(hardcore|困难|地狱|硬核)$/.test(d)) return 'hardcore';
  return 'standard'; // catch-all 默认标准
}
assert(selOpt('简单') === 'narrative' && selOpt('叙事') === 'narrative' && selOpt('narrative') === 'narrative', '③旧档简单/叙事 → 高亮 叙事·温和');
assert(selOpt('困难') === 'hardcore' && selOpt('地狱') === 'hardcore' && selOpt('hardcore') === 'hardcore', '③旧档困难/地狱 → 高亮 硬核');
assert(selOpt('普通') === 'standard' && selOpt('中等') === 'standard' && selOpt('standard') === 'standard', '③旧档普通/中等 → 高亮 标准');
assert(selOpt('') === 'standard' && selOpt('乱值') === 'standard', '③未设/乱值 → 默认高亮 标准');
console.log('  ③ 选择器迁移: 旧档中文难度值高亮到对的新选项·未设兜标准·存盘统一为 narrative/standard/hardcore');

// ④ P-QAM 门阈值按难度（与 tm-endturn-apply.js:306 民变闸 / :491 政变门 内联三元逐字一致）
function revoltMX(dn) { return dn === 'narrative' ? 35 : (dn === 'hardcore' ? 65 : 50); }   // 民心≥此·AI起事不坐实
function coupT(dn) { return dn === 'narrative' ? 45 : (dn === 'hardcore' ? 75 : 60); }       // 皇权或皇威≥此·驳回凭空政变
assert(revoltMX(diffNorm('narrative')) === 35 && revoltMX(diffNorm('简单')) === 35, '④叙事民变闸阈值 35');
assert(revoltMX(diffNorm('standard')) === 50 && revoltMX(diffNorm('普通')) === 50, '④标准民变闸阈值 50');
assert(revoltMX(diffNorm('hardcore')) === 65 && revoltMX(diffNorm('困难')) === 65, '④硬核民变闸阈值 65');
assert(coupT(diffNorm('narrative')) === 45 && coupT(diffNorm('standard')) === 60 && coupT(diffNorm('hardcore')) === 75, '④政变门阈值 叙事45/标准60/硬核75');
assert(revoltMX('narrative') < revoltMX('standard') && revoltMX('standard') < revoltMX('hardcore'), '④方向:叙事民变闸阈值最低=最多省免疫凭空民变·硬核最高=危机最多');
assert(coupT('narrative') < coupT('standard') && coupT('standard') < coupT('hardcore'), '④方向:叙事政变门阈值最低=皇权皇威稍高即拦护玩家·硬核最高=最易政变得逞');
console.log('  ④ P-QAM门按难度: 民变闸 叙事35/标准50/硬核65·政变门 叙事45/标准60/硬核75·叙事最护玩家硬核最刺激');

console.log('[verify-difficulty-pacing] PASS assertions=' + passed);
