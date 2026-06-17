#!/usr/bin/env node
'use strict';
// smoke-tier2-l10n — Tier2 本地化清扫(簇7·英文泄漏+空状态)
//   源契约:玩家可见 toast/列表的英文枚举→中文映射在位、旧英文泄漏已除、空状态已补。
const fs = require('fs'), path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m){ if(!c) throw new Error('FAIL: '+m); A++; console.log('  ✓ '+m); }
function read(f){ return fs.readFileSync(path.join(ROOT,f),'utf8'); }

console.log('smoke-tier2-l10n');
const applier = read('tm-ai-change-applier.js');
const hist = read('tm-history-events.js');
const ea = read('tm-endturn-apply.js');
const fm = read('phase8-formal-modules.js');

// ── tm-ai-change-applier.js ──
ok(/disaster_relief:'赈灾'[\s\S]{0,200}\[la\.type\]\|\|la\.type\) \+ ' ' \+ \(la\.amount/.test(applier), '地方官 toast 用中文映射(la.type 不再裸泄漏)');
ok(applier.indexOf("anticorruption:'肃贪'") >= 0, '财政改革 fr.type 中文映射在位');
ok(applier.indexOf('P-VWF 对账层') < 0, '★财政改革 toast 去工程黑话 P-VWF');

// ── tm-history-events.js(影响预览×2 站点) ──
ok((hist.match(/strength:'国力'/g) || []).length >= 2, '史事影响 impact-key 中文映射在两站点(编辑器预览+弹窗)');
ok(/\[key\]\|\|key\) \+ ' ' \+ sign/.test(hist), '编辑器预览用映射');
ok(/\[key\]\|\|key\) \+ ': ' \+ sign/.test(hist), '刚性事件弹窗用映射');

// ── tm-endturn-apply.js ──
ok(ea.indexOf("toFaction:'据地立帜'") >= 0, '起义转化 transformType 中文映射');
ok(ea.indexOf("military:'军镇'") >= 0, '立国 fc.type 中文映射');
ok(ea.indexOf("forced_abdication:'逼宫禅位'") >= 0, '继承 disputeType 中文映射');
ok(ea.indexOf("autonomous 互动(") < 0, '★NPC过滤 toast 去英文 autonomous(互动·注释非泄漏保留)');
ok(ea.indexOf("autonomous 对外") < 0, '★NPC过滤 toast 去英文 autonomous(对外)');
ok(ea.indexOf("autonomous 作") < 0, '★NPC过滤 toast 去英文 autonomous(代行·agent漏报第三处)');
ok(/addEB\([^)]*autonomous/.test(ea) === false, '★无任何 addEB toast 含 autonomous');
ok(ea.indexOf('擅自互动') >= 0 && ea.indexOf('擅自对外') >= 0 && ea.indexOf('擅自代行') >= 0, '三处改用「擅自」');
ok(ea.indexOf('var _bcDisp =') >= 0, '建设 toast 用 _bcDisp(BUILDING_TYPES 中文名)');
ok(ea.indexOf("'拆除 ' + bc.type)") < 0, '★建设拆除 toast 不再裸 bc.type');

// ── phase8-formal-modules.js ──
ok(fm.indexOf("pending:'待批'") >= 0, '奏疏 status 英文 pending→中文映射');
ok(fm.indexOf('暂无待批奏疏') >= 0, '★奏疏列表空状态已补');
ok(fm.indexOf('暂无近事记录') >= 0, '★记录列表空状态已补');
ok(/mems\.length \? mems\.map/.test(fm), '奏疏空状态用 length 三元守卫');
ok(/events\.length \? events\.map/.test(fm), '记录空状态用 length 三元守卫');

console.log('\n结果: '+A+' 通过 / 0 失败');
