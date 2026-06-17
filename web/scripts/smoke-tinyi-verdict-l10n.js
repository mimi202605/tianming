#!/usr/bin/env node
'use strict';
// smoke-tinyi-verdict-l10n — 圣意补述modal真bug + 廷议 addEB/bubble 英文泄漏清理
//   #15 modal:① 单一 id=ty3-vd-input ② 保存按钮接 _ty3_phase6_saveVerdictNote ③ 暂不补述(skip) ④ 无英文placeholder/Skip ⑤ 无 +  + NaN typo
//   #30 l10n:⑥ addEB 零英文类别(Court Debate/tinyi-preaudit/Recommendation/Seal) ⑦ 无 held:/private:/small:/public:/Appointed/Recorded summary/cohesion -3/反 ition ⑧ 中文替换到位
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');
let A = 0;
function ok(c, m){ if(!c) throw new Error('FAIL: '+m); A++; console.log('  ✓ '+m); }
const src = fs.readFileSync(path.join(ROOT,'tm-tinyi-v3.js'),'utf8');
function count(needle){ return src.split(needle).length-1; }

console.log('smoke-tinyi-verdict-l10n');

// ── #15 圣意补述 modal ──
ok(count('id="ty3-vd-input"')===1, '#15 ① 单一 textarea id(去重·原 2 个)');
ok(/onclick="_ty3_phase6_saveVerdictNote\(\)"/.test(src), '#15 ② 保存按钮接线 _ty3_phase6_saveVerdictNote');
ok(/朱笔录之/.test(src), '#15 ② 保存按钮文案「朱笔录之」');
ok(/onclick="_ty3_phase6_skipVerdictNote\(\)"/.test(src) && /暂不补述/.test(src), '#15 ③ 跳过按钮「暂不补述」');
ok(count('Optional verdict note')===0, '#15 ④ 无英文 placeholder');
ok(count('>Skip<')===0, '#15 ④ 无英文 Skip 按钮');
ok(count('+  +')===0, '#15 ⑤ 无 +  + (NaN typo 已修)');
ok(/function _ty3_phase6_saveVerdictNote\(\)/.test(src) && /getElementById\('ty3-vd-input'\)/.test(src), '#15 保存函数读取该 textarea(端到端通)');

// ── #30 廷议 addEB/bubble 英文清理 ──
ok(count("addEB('Court Debate'")===0, "#30 ⑥ 无 addEB('Court Debate')");
ok(count("addEB('tinyi-preaudit'")===0, "#30 ⑥ 无 addEB('tinyi-preaudit')");
ok(count("addEB('Recommendation'")===0, "#30 ⑥ 无 addEB('Recommendation')");
ok(count("addEB('Seal'")===0, "#30 ⑥ 无 addEB('Seal')");
['held: ','private: ','small: ','public: ','Appointed ','Recorded summary','cohesion -3','反 ition','Decree issued','Blocked by '].forEach(function(s){
  ok(count(s)===0, '#30 ⑦ 残留英文/讹字清零: '+s.trim());
});
// 中文替换到位
['留中·','私决御前·','小议·','公议·','任命·','议毕纪要·','凝聚 -3'].forEach(function(s){
  ok(src.indexOf(s)>=0, '#30 ⑧ 中文替换到位: '+s);
});
ok(/addEB\('议前'/.test(src) && /addEB\('廷推'/.test(src) && /addEB\('廷议'/.test(src), '#30 ⑧ EB 类别中文化(议前/廷推/廷议)');

console.log('\n结果: '+A+' 通过 / 0 失败');
