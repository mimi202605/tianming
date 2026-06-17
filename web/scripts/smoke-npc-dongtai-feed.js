#!/usr/bin/env node
'use strict';
// smoke-npc-dongtai-feed — 验证「朝野动态 feed」(#3·2026-06-14)
// 抽取 feed 纯逻辑助手在 vm 沙箱实跑（非重新实现）：
//   · 倾向分类 _dtTone：攻讦=h / 结纳=f / 中性=n
//   · 行为译名 _dtVerb：英文→中文、未知英文→中性词（绝不漏英文）、已中文原样、优先全局单一真源
//   · _dtRows：窗口过滤 + 排除 blocked/无 actor + 按回合降序
//   · 源契约：图志视图 tab/分发/读 _npcActionLedger + apply.js 暴露 behaviorVerbCN 单一真源

const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

let passed = 0;
function assert(c, m){ if(!c) throw new Error('[assert] ' + m); passed++; }

const zhiSrc = fs.readFileSync(path.join(ROOT, 'tm-renwu-tuzhi.js'), 'utf8');

// ── 抽取 feed 纯逻辑助手块（_DT_BEHAVIOR_CN … 到 renderDongtai 之前） ──
const si = zhiSrc.indexOf('var _DT_BEHAVIOR_CN={');
const ei = zhiSrc.indexOf('function renderDongtai(){');
assert(si >= 0, 'feed 助手块存在');
assert(ei > si, 'renderDongtai 在助手块之后');
const helperSrc = zhiSrc.slice(si, ei);

function makeCtx(opts) {
  opts = opts || {};
  const ctx = {
    console, Math, Object, Array, Number, String, Boolean, RegExp, JSON, Date,
    state: { dtWin: opts.dtWin == null ? 6 : opts.dtWin },
    _g: function(){ return { turn: opts.turn == null ? 10 : opts.turn, _npcActionLedger: opts.ledger || [] }; },
    TM: opts.TM || undefined
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx; // 镜像浏览器：window===global，裸 TM 与 window.TM 同源
  vm.createContext(ctx);
  vm.runInContext(helperSrc, ctx, { filename: 'dongtai-helpers' });
  return ctx;
}

// ── 1. 倾向分类 ──
{
  const c = makeCtx({});
  assert(c._dtTone('impeach') === 'h', '弹劾=攻讦 h');
  assert(c._dtTone('frame_up') === 'h', '构陷=攻讦 h');
  assert(c._dtTone('gift_present') === 'f', '馈赠=结纳 f');
  assert(c._dtTone('master_disciple') === 'f', '收徒=结纳 f');
  assert(c._dtTone('travel') === 'n', '游历=中性 n');
  assert(c._dtTone('') === 'n', '空=中性 n');
}

// ── 2. 行为译名（绝不漏英文） ──
{
  const c = makeCtx({});
  assert(c._dtVerb('impeach') === '弹劾', 'impeach→弹劾');
  assert(c._dtVerb('form_clique') === '结党', 'form_clique→结党');
  assert(c._dtVerb('totally_unknown_en') === '举动', '未知英文→中性词「举动」（不漏英文）');
  assert(!/[a-z]/i.test(c._dtVerb('totally_unknown_en')), '译名不含英文字母');
  assert(c._dtVerb('密谋') === '密谋', '已是中文→原样');
}

// ── 3. 单一真源优先 ──
{
  const c = makeCtx({ TM: { NPC: { behaviorVerbCN: function(bt){ return 'CN<' + bt + '>'; } } } });
  assert(c._dtVerb('impeach') === 'CN<impeach>', '存在全局 TM.NPC.behaviorVerbCN 时优先用之（单一真源）');
}

// ── 4. _dtRows 窗口过滤 + 排序 ──
{
  const ledger = [
    { actor: '甲', behaviorType: 'impeach', turn: 10, createdAt: 1 },
    { actor: '乙', behaviorType: 'gift_present', turn: 9, createdAt: 2 },
    { actor: '丙', behaviorType: 'slander', turn: 3, createdAt: 3 },      // win=6·10-3=7 越窗·排除
    { actor: '丁', behaviorType: 'betray', turn: 10, status: 'blocked', createdAt: 4 }, // blocked·排除
    { behaviorType: 'travel', turn: 10, createdAt: 5 },                   // 无 actor·排除
    { actor: '戊', behaviorType: 'recommend', turn: 10, preflight: { ok: false }, createdAt: 6 } // preflight 失败·排除
  ];
  const c = makeCtx({ turn: 10, dtWin: 6, ledger });
  const rows = c._dtRows();
  assert(rows.length === 2, '窗口=6 过滤后仅 2 条有效（实 ' + rows.length + '）');
  assert(rows[0].actor === '甲' && rows[1].actor === '乙', '按回合降序：甲(10)→乙(9)');

  const cAll = makeCtx({ turn: 10, dtWin: 0, ledger });
  const rowsAll = cAll._dtRows();
  assert(rowsAll.length === 3, '窗口=全部时含越窗的丙（共 3 条·实 ' + rowsAll.length + '）');
}

// ── 5. 源契约 ──
{
  assert(/\['dongtai','朝野动态'\]/.test(zhiSrc), '图志视图 tab 含「朝野动态」');
  assert(zhiSrc.indexOf("if(state.view==='dongtai'){renderDongtai();return;}") >= 0, 'renderMain 分发 dongtai');
  assert(zhiSrc.indexOf("if(state.view==='dongtai')return renderFolioDongtai();") >= 0, 'renderFolio 分发 dongtai');
  assert(zhiSrc.indexOf('_npcActionLedger') >= 0, 'feed 读 _npcActionLedger（兑现写而不读的幽灵）');
  assert(zhiSrc.indexOf('setDtWin:function') >= 0, 'TMZhi.setDtWin 方法存在');
  const applySrc = fs.readFileSync(path.join(ROOT, 'tm-endturn-apply.js'), 'utf8');
  assert(applySrc.indexOf('TM.NPC.behaviorVerbCN = _npcBehaviorVerbCN') >= 0, 'apply.js 暴露 behaviorVerbCN 单一真源');
}

console.log('PASS smoke-npc-dongtai-feed · ' + passed + ' 断言');
