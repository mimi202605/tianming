// M12 codemod — 修嵌套表单 roster 缺口：人物补能力值、势力补影响力、兜底窗口 18→40+排除 _。
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

// 1) 人物 roster 补能力值（在 class 后插）
const CH_ANCHOR = "        'occupation', 'rankLevel', 'class',\n";
const CH_NEW = CH_ANCHOR +
  "        'intelligence', 'valor', 'military', 'administration', 'management', 'charisma', 'diplomacy', 'benevolence', 'integrity', 'loyalty',\n";
replaceOnce(CH_ANCHOR, CH_NEW, 'char-stats');

// 2) 势力 roster 补影响力（在 fiscalCondition 行后插）
const FA_ANCHOR = "        'strength', 'militaryStrength', 'economy', 'fiscalCondition',\n";
const FA_NEW = FA_ANCHOR +
  "        'courtInfluence', 'popularInfluence', 'factionType', 'loyaltyToSong', 'cultureLevel', 'prestige', 'population', 'internalTension',\n";
replaceOnce(FA_ANCHOR, FA_NEW, 'faction-influence');

// 3) entity-merge 兜底窗口 18→40 + 排除 _ 前缀（保留 object 排除）
const MG_ANCHOR =
  "    if (entity && isObject(entity)) Object.keys(entity).slice(0, 18).forEach(function(key) {\n" +
  "      if (base.indexOf(key) < 0 && !isObject(entity[key])) {";
const MG_NEW =
  "    if (entity && isObject(entity)) Object.keys(entity).slice(0, 40).forEach(function(key) {\n" +
  "      if (base.indexOf(key) < 0 && !isObject(entity[key]) && key.charAt(0) !== '_') {";
replaceOnce(MG_ANCHOR, MG_NEW, 'merge-cap');

fs.writeFileSync(path, s, 'utf8');
console.log('EDITS:', edits.join(' | '), '| delta bytes:', s.length - orig.length);
