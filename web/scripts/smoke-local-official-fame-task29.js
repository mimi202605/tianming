#!/usr/bin/env node
// smoke-local-official-fame-task29.js - task#29 民众敬爱:地方官 fame → localOfficial 民心源(并入既有驱动·防双驱)
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
let passed = 0;
function assert(cond, msg) { if (!cond) throw new Error(msg); passed++; }

function createContext() {
  const ctx = {
    console, Date, JSON, Math: Object.create(Math), RegExp, Error, Array, Object, String, Number, Boolean,
    parseInt, parseFloat, isFinite, isNaN, setTimeout() {}, clearTimeout() {},
    document: { getElementById: () => null, querySelector: () => null, querySelectorAll: () => [], addEventListener() {}, createElement: () => ({ style: {}, classList: { add() {}, remove() {} } }), body: {}, head: {}, readyState: 'complete' },
    localStorage: { getItem: () => null, setItem() {}, removeItem() {} },
    navigator: { userAgent: 'node' }, GM: {}, P: {}, scriptData: {},
    escHtml: v => String(v == null ? '' : v), toast() {}, addEB() {},
    findScenarioById() { return null; }, EventBus: { emit() {} }, SettlementPipeline: { register() {} }, EndTurnHooks: { register() {} },
    TM: { errors: { capture() {}, captureSilent() {} } }
  };
  ctx.Math.random = () => 0.99;
  ctx.window = ctx; ctx.globalThis = ctx;
  vm.createContext(ctx);
  return ctx;
}
function baseGM(chars) {
  const mx = 60;
  return {
    turn: 1, settings: {}, chars: chars || [],
    guoku: { money: 1000000 }, neitang: { money: 100000 },
    corruption: { overall: 40, trueIndex: 40, perceivedIndex: 40 },
    population: { fugitives: 1000, hiddenCount: 500, national: { mouths: 1000000, ding: 350000, fugitives: 1000, hiddenCount: 500 } },
    minxin: { trueIndex: mx, perceivedIndex: mx, phase: 'stable', sources: {}, drains: {}, subDims: { urban: { value: mx }, rural: { value: mx }, elite: { value: mx }, military: { value: mx } }, revolts: [] },
    huangquan: { index: 55, phase: 'moderate', trend: 'stable', subDims: { central: { value: 55 }, provincial: { value: 55 }, military: { value: 55 }, imperial: { value: 55 } }, sources: {}, drains: {}, ministers: {}, history: { purges: [], reforms: [] } },
    huangwei: { index: 60, phase: 'normal', trend: 'stable', subDims: { court: { value: 60 }, provincial: { value: 60 }, military: { value: 60 }, foreign: { value: 60 } }, perceivedIndex: 60, sources: {}, drains: {}, tyrantSyndrome: { active: false }, lostAuthorityCrisis: { active: false }, history: { tyrantPeriods: [], crisisPeriods: [], pastHumiliations: [], lastActionTurn: 1 } }
  };
}
function run(chars) {
  const ctx = createContext();
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-authority-engines.js'), 'utf8'), ctx, { filename: 'tm-authority-engines.js' });
  ctx.GM = baseGM(chars);
  ctx.AuthorityEngines.init();
  ctx.AuthorityEngines.tick({ turn: 1, monthRatio: 1 });
  return ctx.GM;
}

function main() {
  // 整廉度全中性(60)→ 整廉块静默(corrupt=clean=0)·只让 fame 块生效·隔离
  function officials(fame) {
    return [
      { name: 'a', alive: true, officialTitle: '尚书', integrity: 60, resources: { fame: fame } },
      { name: 'b', alive: true, officialTitle: '侍郎', integrity: 60, resources: { fame: fame } },
      { name: 'c', alive: true, officialTitle: '巡抚', integrity: 60, resources: { fame: fame } }
    ];
  }
  const beloved = run(officials(80));   // 众望所归
  const hated = run(officials(-50));    // 恶名昭彰
  const neutral = run(officials(10));   // 名望平平(不触 fame 块)

  const bL = Number(beloved.minxin.sources.localOfficial) || 0;
  const hL = Number(hated.minxin.sources.localOfficial) || 0;
  const nL = Number(neutral.minxin.sources.localOfficial) || 0;

  assert(bL > 0, '清望素著→localOfficial 源 +, got ' + bL);
  assert(hL < 0, '民怨载道→localOfficial 源 -, got ' + hL);
  assert(bL > hL, '敬爱>怨恨:beloved 源高于 hated (' + bL + ' > ' + hL + ')');
  assert(nL === 0, '名望平平不触发 fame 块(对照·localOfficial=0), got ' + nL);

  // per-turn 钳制:即使 50 个高 fame 官·单回合 fame 贡献被 min(3,diff) 钳到 ≤0.15(防暴冲·不随官数线性涨)
  // (源累计封顶 [-18,12] 由 MinxinLedger 回合末 regularizeSourceCaps 削平·非 authority-engines.tick 内·既有架构)
  let many = [];
  for (let i = 0; i < 50; i++) many.push({ name: 'm' + i, alive: true, officialTitle: '官', integrity: 60, resources: { fame: 90 } });
  const big = run(many);
  const oneTickL = Number(big.minxin.sources.localOfficial) || 0;
  assert(oneTickL > 0 && oneTickL <= 0.16, '单回合 fame 贡献被 min(3) 钳制≤0.15(50官不暴冲), got ' + oneTickL);

  console.log('[smoke-local-official-fame-task29] PASS ' + passed + ' assertions');
}
try { main(); } catch (err) { console.error('[smoke-local-official-fame-task29] FAIL'); console.error(err && err.stack || err); process.exit(1); }
