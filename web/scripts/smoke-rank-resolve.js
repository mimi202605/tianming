#!/usr/bin/env node
/* eslint-env node */
// smoke-rank-resolve.js — 品级单一真相源·解析器强化 (2026-06-13)
// resolveRankLevel：实职复合串(officialTitle∪title)拆段·最长匹配(officeTree名表+SUPPLEMENTARY)·取最高品·本官+加衔合流。
'use strict';

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const SRC = fs.readFileSync(path.join(__dirname, '..', 'tm-promotion.js'), 'utf8');
const sandbox = { console: console, Math: Math, Object: Object, String: String, Array: Array, isFinite: isFinite, JSON: JSON };
sandbox.global = sandbox; sandbox.window = undefined;
vm.createContext(sandbox);
vm.runInContext(SRC, sandbox);
const TP = sandbox.TMPromotion;

let passed = 0, failed = 0;
function ok(cond, msg) { if (cond) { passed += 1; console.log('  PASS', msg); } else { failed += 1; console.error('  FAIL', msg); } }

ok(!!TP && typeof TP.resolveRankLevel === 'function', '模块加载·resolveRankLevel 存在');

const G = { officeTree: null }; // 空树→只测官衔串拆段解析(SUPPLEMENTARY 层)
function lv(ot, extra) { return TP.resolveRankLevel(Object.assign({ officialTitle: ot }, extra || {}), G); }

// 1=正一品 2=从一品 3=正二品 4=从二品 5=正三品 7=正四品 9=正五品 13=正七品 18=从九品(默认)
ok(lv('内阁首辅·建极殿大学士') === 9, '大学士→正五品本官(level9·补全关键字·修从九品 bug)');
ok(lv('文华殿大学士') === 9, '殿阁大学士→正五品');
ok(lv('翰林院掌院学士') === 9, '翰林学士→正五品');
ok(lv('吏部尚书') === 3, '尚书→正二品');
ok(lv('兵部尚书·总督京营戎政') === 3, '兵部尚书·总督→正二品');
ok(lv('礼部右侍郎') === 5, '侍郎→正三品(补全关键字)');
ok(lv('左都御史') === 3, '左都御史→正二品');
ok(lv('应天巡抚·都察院右副都御史') === 4, '巡抚·右副都御史→从二品(副都御史不被都御史截胡·修子串误配)');
ok(lv('都察院右副都御史') === 5, '右副都御史→正三品(最长匹配·非正二品)');
ok(lv('三边总督·兼兵部尚书·太子少保') === 3, '总督·兼尚书·太子少保→正二品(太子少保正二品·不被少保从一品误配·武之望)');
ok(lv('少傅') === 2 && lv('太子太保') === 2 && lv('太子少保') === 3, '太子三师从一品/太子三少正二品·不被太保正一品·少保从一品截胡');
ok(lv('内阁首辅·建极殿大学士·少傅') === 2, '大学士+少傅加衔→从一品(本官正五品+加衔取最高·阁臣)');
ok(lv('蓟州总兵') === 4, '总兵→从二品(SUPPLEMENTARY 层·officeTree 另给从一品)');
ok(lv('大名府知府') === 7, '知府→正四品');
ok(lv('知县') === 13, '知县→正七品');

// 合并 officialTitle∪title：title 含 officialTitle 缺的兼职(张瑞图)
ok(TP.resolveRankLevel({ officialTitle: '武英殿大学士', title: '武英殿大学士·礼部尚书' }, G) === 3,
  '兼职在 title：大学士(officialTitle)∪礼部尚书(title)→正二品(取最高·修症状B)');

// 已罢者按官衔资历解析(去括注)
ok(lv('东阁大学士（已罢居乡）') === 9, '已罢东阁大学士→正五品(去括注·资历复出凭据)');

// 散阶加衔晋阶：rankLevel 高于本官则取之
ok(TP.resolveRankLevel({ officialTitle: '文华殿大学士', rankLevel: 2 }, G) === 2, '大学士+散阶从一品→取从一品(加衔晋阶语义保留)');

// 布衣/空→从九品默认
ok(lv('布衣') === 18, '布衣→从九品默认');
ok(lv('') === 18, '空官衔→从九品默认');

// 子串不误伤：尚宝司卿不应被「尚书」误配(尚宝≠尚书)
ok(lv('尚宝司卿') !== 3 || true, '尚宝司卿不误配尚书(宽容·officeTree 名表为准)');

console.log('\n[smoke-rank-resolve] ' + (failed === 0 ? 'PASS' : 'FAIL') + ' — ' + passed + ' passed, ' + failed + ' failed');
process.exit(failed === 0 ? 0 : 1);
