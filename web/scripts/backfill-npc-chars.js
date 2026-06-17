#!/usr/bin/env node
// scripts/backfill-npc-chars.js — Phase D1·NPC chars + party 补全
// 2026-05-10·use: node scripts/backfill-npc-chars.js
//
// 目的: 让 NPC chaoyi/office/memorial 不再 noop·补两步
//   (1) 给现有 NPC chars 加 position + party·按 paradigm 模板
//   (2) 给 0-chars NPC 补 1 ruler + 2-3 court/general·至少能演

'use strict';
const fs = require('fs');
const path = require('path');
const SCN_DIR = path.resolve(__dirname, '..', '..', 'scenarios');

// Phase D1·2026-05-10·共用 utility
const detectParadigm = require(path.resolve(__dirname, '..', 'tm-faction-paradigm.js')).detect;

// paradigm → position 模板 (索引匹配)
// 第一个总是 ruler 类·后续 court/general/clan
var POSITION_TEMPLATES = {
  central_empire:    ['皇帝', '内阁大学士', '兵部尚书', '宗室亲王', '都督'],
  manchu_empire:     ['汗', '贝勒', '大臣', '旗主总兵', '议政大臣'],
  mongol_tribe:      ['可汗', '台吉', '那颜', '部落贵族'],
  tributary_kingdom: ['国王', '领议政', '兵曹判书', '大君', '都体察使'],
  european_outpost:  ['总督', '主教', '商团长官', '舰队司令', '法庭裁判'],
  maritime_merchant: ['海商首领', '副帅', '帐房', '舵手统领'],
  native_chieftain:  ['土司', '族老', '头人', '亲将'],
  rebellion:         ['首领', '军师', '大将', '副将'],
  military_jiedushi: ['节度使', '都统制', '参议', '裨将'],
  remnant_dynasty:   ['首领', '近臣', '武臣', '宗室'],
  generic:           ['首领', '大臣', '将领', '宗室']
};

// Phase E2·paradigm → 默认 loyalty 中位数 (反映史观·避免全 NPC 都 80+)
// ruler 一律 +10 加成·non-ruler 用此中位 ± 10 噪声
var LOYALTY_BY_PARADIGM = {
  central_empire: 60,    // 党争·摇摆
  manchu_empire: 80,     // 旗主忠汗
  mongol_tribe: 65,      // 部众分裂·西迁中尤甚
  tributary_kingdom: 55, // 朝鲜·两班分裂·受外辱后
  european_outpost: 70,  // 殖民团结但远本国
  maritime_merchant: 50, // 海商·利合则忠·利散则离
  native_chieftain: 45,  // 族灭余裔·人心散
  rebellion: 40,         // 起义·新附·未稳
  military_jiedushi: 60, // 节度·依附但有异志
  remnant_dynasty: 50,   // 遗民·凄凉
  generic: 55
};

// paradigm → party 模板 (供分 chars 给两党·让 chaoyi 演)
var PARTY_TEMPLATES = {
  central_empire:    ['阉党', '东林党'],
  manchu_empire:     ['满洲八旗', '汉军八旗'],
  mongol_tribe:      ['本部', '附属部'],
  tributary_kingdom: ['西人', '南人'],
  european_outpost:  ['商团', '教士团'],
  maritime_merchant: ['郑氏宗族', '客卿团'],
  native_chieftain:  ['本族', '附属族'],
  rebellion:         ['元从', '新附'],
  military_jiedushi: ['老兵', '新归'],
  remnant_dynasty:   ['宗室', '降将'],
  generic:           ['本派', '客派']
};

// 0-chars NPC 补充模板 (按 paradigm)·按史观挑常见名
// 每个 NPC 至少补 1 ruler + 3 supporting
var FILL_CHAR_NAMES = {
  '科尔沁蒙古':       ['奥巴台吉', '满珠习礼', '布和台吉', '巴达礼'],
  '葡萄牙·澳门':     ['洛波·萨缅托·德·卡瓦略 (理事官)', '阿莱绍·塞洛斯 (主教)', '若昂·苏亚雷斯 (商团长)', '佩德罗·马孔德斯 (船队司令)'],
  '荷兰·台海(东印度公司)': ['彼得·德·卡彭蒂尔 (台湾长官)', '普特曼斯 (副长官)', '雷约兹 (舰队司令)', '宋克 (商务议员)'],
  '西班牙·马尼拉':   ['尼尼奥·德·塔沃拉 (总督)', '胡安·塞维科斯 (主教)', '迭戈·德·基罗加 (商团长)', '佩德罗·德·埃雷迪亚 (舰队司令)'],
  '播州土司·杨氏(余裔)': ['杨惟栋 (族老)', '杨光宇 (头人)', '王朝琏 (亲将)', '安氏遗族·安邦俊'],
  '奢安之乱联军':    ['奢崇明遗·奢寅', '安邦彦遗·安效良', '罗乾 (大将)', '陈其愚 (军师)']
};

function _looksLikePos(name, paradigm) {
  // 若名字本就含 (...) 标注·跳过
  return null;
}

function backfillScenario(filePath) {
  if (!fs.existsSync(filePath)) {
    console.log('skip·not found: ' + filePath);
    return;
  }
  var bakDir = path.join(path.dirname(filePath), '_archived-backups');
  fs.mkdirSync(bakDir, { recursive: true });
  var bakPath = path.join(bakDir, path.basename(filePath) + '.pre-d1-chars.bak');
  if (!fs.existsSync(bakPath)) fs.copyFileSync(filePath, bakPath);
  var sc = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  var name = path.basename(filePath);
  var playerName = sc.playerInfo && sc.playerInfo.factionName;
  var facs = sc.factions || [];

  console.log('\n=== ' + name + ' ===');

  var changed = 0, addedChars = 0;

  // (1) 给现有 NPC chars 加 position + party
  facs.forEach(function(fac) {
    if (!fac || !fac.name) return;
    if (fac.name === playerName) return;  // skip player
    var paradigm = detectParadigm(fac.name, fac);
    var posTpl = POSITION_TEMPLATES[paradigm] || POSITION_TEMPLATES.generic;
    var partyTpl = PARTY_TEMPLATES[paradigm] || PARTY_TEMPLATES.generic;
    var existing = sc.characters.filter(function(c){ return c.faction === fac.name; });

    existing.forEach(function(c, idx) {
      // 若已有 position·skip
      if (!c.position && !c.role && !c.title) {
        // index 0 → ruler·后续按模板
        c.position = posTpl[Math.min(idx, posTpl.length - 1)];
        changed++;
      }
      if (!c.party) {
        // 平均分两党 (alt 派别)·让 chaoyi 能跑
        c.party = partyTpl[idx % partyTpl.length];
        changed++;
      }
    });
  });

  // (2) 给 chars < 4 的 NPC 补到 4 (至少 1 ruler + 2-3 court/general·让 chaoyi 有 2 党可演)
  facs.forEach(function(fac) {
    if (!fac || !fac.name) return;
    if (fac.name === playerName) return;
    var existing = sc.characters.filter(function(c){ return c.faction === fac.name; });
    if (existing.length >= 4) return;  // 4+ skip

    var paradigm = detectParadigm(fac.name, fac);
    var posTpl = POSITION_TEMPLATES[paradigm] || POSITION_TEMPLATES.generic;
    var partyTpl = PARTY_TEMPLATES[paradigm] || PARTY_TEMPLATES.generic;
    var nameList = FILL_CHAR_NAMES[fac.name];

    if (!nameList) {
      nameList = [];
      if (fac.leader && existing.length === 0) nameList.push(fac.leader);
      nameList.push(fac.name + '·近臣甲', fac.name + '·近臣乙', fac.name + '·近臣丙', fac.name + '·近臣丁');
    }

    // 还需补的数 = 4 − existing.length
    var needFill = 4 - existing.length;
    nameList.slice(0, needFill).forEach(function(n, idx) {
      // 全局 idx (含已存在 chars 的偏移)·按 idx 交替分两党
      var globalIdx = existing.length + idx;
      var partyChoice = partyTpl[globalIdx % partyTpl.length];
      // Phase E2·paradigm-aware 默认 loyalty
      var medianLoyalty = LOYALTY_BY_PARADIGM[paradigm] || 55;
      var charLoyalty;
      if (globalIdx === 0) {
        // ruler·中位 +15·上限 95
        charLoyalty = Math.min(95, medianLoyalty + 15);
      } else {
        // non-ruler·中位 ± 12 噪声
        charLoyalty = Math.max(10, Math.min(95, medianLoyalty + Math.floor(Math.random() * 25) - 12));
      }
      var newChar = {
        name: n.replace(/ \(.*$/, ''),
        faction: fac.name,
        factionId: fac.id || fac.sid || fac.name,
        position: posTpl[Math.min(globalIdx, posTpl.length - 1)],
        party: partyChoice,
        loyalty: charLoyalty,
        charisma: 50 + Math.floor(Math.random() * 30),
        military: 50 + Math.floor(Math.random() * 25),
        intelligence: 60 + Math.floor(Math.random() * 25),
        alive: true,
        _generatedByD1: true
      };
      sc.characters.push(newChar);
      addedChars++;
    });
  });

  fs.writeFileSync(filePath, JSON.stringify(sc, null, 2), 'utf8');
  console.log('  现有 NPC chars 补字段: ' + changed + ' 项·新增 chars: ' + addedChars);
}

function main() {
  var arg = process.argv[2];
  var files = arg
    ? [arg === 'tianqi' ? '天启七年·九月（官方）.json' : arg]
    : ['天启七年·九月（官方）.json', '崇祯.json', '挽天倾：崇祯死局.json'];
  files.forEach(function(f) {
    backfillScenario(path.join(SCN_DIR, f));
  });
}

try { main(); } catch (e) { console.error(e); process.exit(1); }
