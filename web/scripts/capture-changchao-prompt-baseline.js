#!/usr/bin/env node
// scripts/capture-changchao-prompt-baseline.js
// Slice 0·prompt baseline 捕捉
//
// 读 5 NPC × 2 议题 = 10 组合·从 scenario JSON 提取 prompt 会用的 NPC + 议题字段·
// 模拟 _cc3_aiGenReact 的 prompt 拼接逻辑·dump JSON。
//
// 这不是 runtime 渲染 (因 runtime 需 P/GM/CHARS/NpcMemorySystem 初始化)·而是·
// 结构化提取·把 prompt 会用到的所有字段集中展示·用于 sprint 后 v3 对比。
//
// 用法·
//   node web/scripts/capture-changchao-prompt-baseline.js
// 输出·
//   web/scripts/_baseline-changchao-before-prompts.json

'use strict';

const fs = require('fs');
const path = require('path');

const SCENARIO_TIANQI = path.resolve(__dirname, '..', '..', 'scenarios', '天启七年·九月（官方）.json');
const SCENARIO_SHAOSONG = path.resolve(__dirname, '..', '..', 'scenarios', '绍宋·建炎元年八月（官方）.json');
const OUT = path.resolve(__dirname, '_baseline-changchao-before-prompts.json');

// ─── 5 NPC × 2 议题 baseline picks ───
// 天启 NPC·有 traitIds·8D 生效·覆盖 deceitful/honest/ambitious/wrathful/just 极端
const TIANQI_NPCS = ['魏忠贤', '钱龙锡', '袁崇焕', '孙承宗', '客氏'];
// 绍宋 NPC·无 traitIds·8D 全 0·测 fallback 必要性
const SHAOSONG_NPCS = ['黄潜善', '李纲', '陈东', '张俊', '张邦昌', '韩世忠'];

// 议题·选 controversial 极高·跨多 tag
const TIANQI_ITEM = {
  title: '辽东战守议',
  detail: '袁崇焕所议「五年复辽」之策已数年·东江毛文龙独悬海外·清军屡犯·廷议是否罢宁锦防线·或加饷继守。',
  dept: '兵部',
  presenter: '王在晋',
  target: '',
  urgency: 'urgent',
  controversial: 8,
};

const SHAOSONG_ITEM = {
  title: '是否南幸扬州',
  detail: '应天孤悬·非久驻之地。黄相奏请圣驾南幸扬州·暂避锋芒·李给事言官等抗议·宗泽留守汴梁屡上奏。',
  dept: '中书省',
  presenter: '黄潜善',
  target: '',
  urgency: 'urgent',
  controversial: 8,
};

function loadScenario(p) {
  if (!fs.existsSync(p)) return null;
  return JSON.parse(fs.readFileSync(p, 'utf8'));
}

function findChar(sc, name) {
  return (sc.characters || []).find(c => c.name === name) || null;
}

// 模拟 _cc3_aiGenReact L799-L946 的 prompt 字段提取
function extractPromptFields(ch, item, role) {
  if (!ch) return { error: 'char not found' };

  const personality   = ch.personality || '';
  const loyalty       = (typeof ch.loyalty   === 'number') ? ch.loyalty   : null;
  const integrity     = (typeof ch.integrity === 'number') ? ch.integrity : null;
  const ambition      = (typeof ch.ambition  === 'number') ? ch.ambition  : null;
  const officialTitle = ch.officialTitle || ch.title || '';
  const stance2Player = ch.stanceToPlayer || '';
  const family        = ch.family || '';
  const traits        = Array.isArray(ch.traits) ? ch.traits.join('·') : '';
  const traitIds      = Array.isArray(ch.traitIds) ? ch.traitIds.slice() : [];
  const party         = ch.party || '';
  const faction       = ch.faction || '';
  const rank          = ch.rank || null;
  const charClass     = ch.class || '';

  // 注意·NpcMemorySystem.recall(name, 5) 和 OpinionSystem.getEventOpinion(name, '玩家')
  // 是 runtime-only·node 跑不出·baseline 标 "<runtime>"
  const memorySnippet  = '<runtime-only·NpcMemorySystem.recall(name, 5)>';
  const relationToRuler = '<runtime-only·OpinionSystem.getEventOpinion(name, "玩家")>';

  // v3 spec 设计要用到的·当前 prompt 没用·标"未注入"
  const aiPersonaText = ch.aiPersonaText || '';
  const v3MissingInjection = '⚠️ 当前 _cc3_aiGenReact 没调 TM.PromptComposer.buildAiPersonaText·此 aiPersonaText 字段当前 prompt 中**缺失**';

  return {
    npc: ch.name,
    role,
    archetype: {
      officialTitle,
      faction,
      party,
      rank,
      class: charClass,
      personality,
      traits,
      traitIds,
      stats: { loyalty, integrity, ambition },
      family,
      stance2Player,
    },
    runtime: {
      memorySnippet,
      relationToRuler,
    },
    v3Diff: {
      aiPersonaText_inChar: aiPersonaText ? aiPersonaText.slice(0, 100) + '...' : '<empty>',
      v3MissingInjection,
    },
    item: {
      title: item.title,
      detail: item.detail.slice(0, 80),
      dept: item.dept,
      target: item.target,
      urgency: item.urgency,
      controversial: item.controversial,
      tags_currentlyEmpty: '⚠️ item.tags 当前未生成·Slice 2 才加',
    },
  };
}

function main() {
  const tianqi = loadScenario(SCENARIO_TIANQI);
  const shaosong = loadScenario(SCENARIO_SHAOSONG);
  if (!tianqi || !shaosong) {
    console.error('剧本未找到·检查路径');
    process.exit(1);
  }

  const baseline = {
    _meta: {
      capturedAt: new Date().toISOString(),
      purpose: 'Slice 0 prompt baseline·sprint 完后跟 v3 对比·展示 prompt 字段增量',
      method: 'structural extract (not runtime render)·runtime 依赖标 <runtime-only>',
      slice: 'changchao overhaul Slice 0',
    },
    summary: {
      tianqi: {
        total_chars: (tianqi.characters || []).length,
        sampled_npcs: TIANQI_NPCS,
        item: TIANQI_ITEM.title,
        traitIds_coverage: TIANQI_NPCS.filter(n => {
          const c = findChar(tianqi, n);
          return c && Array.isArray(c.traitIds) && c.traitIds.length > 0;
        }).length + '/' + TIANQI_NPCS.length,
      },
      shaosong: {
        total_chars: (shaosong.characters || []).length,
        sampled_npcs: SHAOSONG_NPCS,
        item: SHAOSONG_ITEM.title,
        traitIds_coverage: SHAOSONG_NPCS.filter(n => {
          const c = findChar(shaosong, n);
          return c && Array.isArray(c.traitIds) && c.traitIds.length > 0;
        }).length + '/' + SHAOSONG_NPCS.length + ' ⚠️ 全 0·8D 在此剧本完全失效·需 fallback',
      },
    },
    tianqi_prompts: TIANQI_NPCS.map(n => extractPromptFields(findChar(tianqi, n), TIANQI_ITEM, 'self')),
    shaosong_prompts: SHAOSONG_NPCS.map(n => extractPromptFields(findChar(shaosong, n), SHAOSONG_ITEM, 'self')),
    v3_expected_additions: {
      aiPersonaText: '将通过 TM.PromptComposer.buildAiPersonaText(gmCh) 注入',
      recognitionState: '将通过 TM.PromptComposer.buildRecognitionState(gmCh) 注入',
      item_tags: 'Slice 2 给议题打 tag·如 foreign-policy/penal-harsh',
      persona_8d: 'Slice 3 通过 TM.NpcEngine.aggregateDims(ch) 读·8 维 ±0.3/0.5/0.7',
      persona8d_fallback: 'Slice 3·若 dims 全 0·从 ch.personality 字符串 keyword 推 dims (B 方案)',
      reactionMode: 'Slice 4-5·6 mode (lead/second/rebut/soften/pivot/cite) + 朝堂语词库',
      reactionTone: 'Slice 5·5 tone·gravitas/procedural/righteous/martial/decorum',
      antiMonotonyGuards: 'Slice 6·4 guards·防 mode 塌缩',
      npcNpcLinkage: 'Slice 6·AffinityMap.add + NpcMemorySystem.remember·朝议塑造派系网',
      cumulativeAndEmperorCue: 'Slice 9 (optional Tier 2)',
    },
  };

  fs.writeFileSync(OUT, JSON.stringify(baseline, null, 2), 'utf8');
  console.log('baseline 已写·' + OUT);
  console.log('天启 sample·' + TIANQI_NPCS.join('·') + ' × 「' + TIANQI_ITEM.title + '」');
  console.log('绍宋 sample·' + SHAOSONG_NPCS.join('·') + ' × 「' + SHAOSONG_ITEM.title + '」');
  console.log('文件大小·' + fs.statSync(OUT).size + ' bytes');
}

main();
