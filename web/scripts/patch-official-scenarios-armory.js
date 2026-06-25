'use strict';
/* patch-official-scenarios-armory.js — 给官方剧本注入武库军备/原料初值(JSON源 + 运行时bundle)
 * 背景:官方剧本运行时走预烤 tm-official-scenario-bundle.js·源为 ../scenarios/*.json。
 * 新增 guoku.armory(甲胄/兵刃/弓弩/火器/战马) + guoku.materials(铁/硝石/皮革/木)。
 * JSON源=targeted 注入(保 pretty 格式·最小 diff);bundle=re-serialize(generated file)。幂等(已有则跳过)·留 .bak。
 */
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname, '..');                 // web/
const SCEN_DIR = path.resolve(ROOT, '..', 'scenarios');     // tianming/scenarios/
const BUNDLE = path.join(ROOT, 'tm-official-scenario-bundle.js');
const STAMP = '.bak-armory-20260620';

/* 各官方剧本军备/原料初值(历史背景) */
const DATA = {
  'sc-tianqi7-1627': {   // 明末天启·辽东战事消耗大·库储偏紧
    json: '天启七年·九月（官方）.json',
    armory: { '甲胄': 320000, '兵刃': 480000, '弓弩': 150000, '火器': 90000, '战马': 110000 },
    materials: { '铁': 600000, '硝石': 90000, '皮革': 140000, '木': 220000 }
  },
  'sc-jianyan1-1127-shaosong': {   // 绍宋建炎·靖康南渡·军备凋敝·战马尤缺(失北方牧场)·弩犹精(神臂弩)
    json: '绍宋·建炎元年八月（官方）.json',
    armory: { '甲胄': 80000, '兵刃': 120000, '弓弩': 90000, '火器': 15000, '战马': 25000 },
    materials: { '铁': 200000, '硝石': 25000, '皮革': 40000, '木': 80000 }
  }
};

function setGuoku(g, id) {
  if (!g || !DATA[id]) return false;
  var ch = false;
  if (!g.armory) { g.armory = DATA[id].armory; ch = true; }
  if (!g.materials) { g.materials = DATA[id].materials; ch = true; }
  return ch;
}

/* 1) JSON 源·targeted 注入(保 pretty·锚 top-level guoku 的 initialMoney) */
Object.keys(DATA).forEach(function (id) {
  var fp = path.join(SCEN_DIR, DATA[id].json);
  if (!fs.existsSync(fp)) { console.log('[skip] JSON源缺: ' + DATA[id].json); return; }
  var txt = fs.readFileSync(fp, 'utf8');
  if (txt.indexOf('"armory"') >= 0) { console.log('[skip] JSON已有armory: ' + id); return; }
  var open = '"guoku": {\n';
  var anchor = open + '    "initialMoney"';
  var at = txt.indexOf(anchor);
  if (at < 0) { console.log('[skip] JSON无 top-level guoku 锚: ' + id); return; }
  var insertAt = at + open.length;
  var inject = '    "armory": ' + JSON.stringify(DATA[id].armory) + ',\n    "materials": ' + JSON.stringify(DATA[id].materials) + ',\n';
  var next = txt.slice(0, insertAt) + inject + txt.slice(insertAt);
  JSON.parse(next);   // 校验仍合法 JSON·不合法则抛
  fs.writeFileSync(fp + STAMP, txt);
  fs.writeFileSync(fp, next);
  console.log('[ok] JSON源注入 ' + id + ' (' + DATA[id].json + ')');
});

/* 2) 运行时 bundle·re-serialize */
var btxt = fs.readFileSync(BUNDLE, 'utf8');
var m = btxt.match(/global\.TMOfficialScenarioBundle\s*=\s*(\[[\s\S]*\]);?\s*\}\)\(window\);?\s*$/);
if (!m) { console.error('[err] bundle 正则提取失败'); process.exit(1); }
var arr = JSON.parse(m[1]);
var bn = 0;
arr.forEach(function (e) { var d = (e && e.data) || {}; if (setGuoku(d.guoku, d.id)) bn++; });
fs.writeFileSync(BUNDLE + STAMP, btxt);
var out = '// GENERATED FILE. Source: ../scenarios official JSON files.\n(function(global){\n  global.TMOfficialScenarioBundle = ' + JSON.stringify(arr) + ';\n})(window);\n';
fs.writeFileSync(BUNDLE, out);
console.log('[ok] bundle 注入 ' + bn + ' 条目');
console.log('完成。');
