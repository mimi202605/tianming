const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const corePath = path.join(__dirname, '..', 'tm-endturn-core.js');
const source = fs.readFileSync(corePath, 'utf8');
const marker = 'TMNS.FactionAiMainloopBridge';
const markerIndex = source.indexOf(marker);
assert(markerIndex >= 0, 'bridge marker missing');
const start = source.lastIndexOf("(function(){\n  var root = (typeof window !== 'undefined')", markerIndex);
const end = source.indexOf("EndTurnHooks.registerFragment('summary-rule'", markerIndex);
assert(start >= 0 && end > start, 'bridge snippet bounds missing');

const eventBoard = [];
const fengwen = [];
const context = {
  console,
  P: { ai: { key: 'test-key' }, playerInfo: { factionName: 'Song' }, conf: {} },
  GM: {
    sid: 'shaosong-test',
    turn: 3,
    facs: [
      { id: 'fac_jin', name: 'Jin', strength: 70, economy: 64, militaryStrength: 82, attitude: 'hostile' },
      { id: 'fac_song', name: 'Song', player: true, strength: 65 }
    ],
    _turnReport: []
  },
  TM: {},
  EndTurnHooks: {
    frags: [],
    registerFragment(name, fn, opts) { this.frags.push({ name, fn, opts }); },
    collectFragments(ctx) {
      return this.frags.map((f) => ({ name: f.name, text: f.fn(ctx) })).filter((f) => f.text);
    }
  },
  __eb: eventBoard,
  __feng: fengwen,
  addEB(type, text) { eventBoard.push({ type, text }); },
  PhaseD: { addFengwen(x) { fengwen.push(x); } },
  findScenarioById(id) {
    assert.strictEqual(id, 'shaosong-test');
    return {
      factions: [
        {
          id: 'fac_jin',
          name: 'Jin',
          leader: '完颜晟',
          aiPersonality: '强攻与威慑并用',
          aiDecisionWeights: { aggression: 0.9, logistics: 0.7 },
          aiConditionalBehaviors: [{ if: '宋金边境虚弱', then: '先压河间走廊' }],
          aiImmersionHooks: ['河间转运廊道']
        }
      ],
      externalForces: [
        {
          id: 'fac_xixia',
          name: 'Xixia',
          aiPersonality: '守横山盐池，伺机索地',
          aiDecisionWeights: { opportunism: 0.8 },
          aiConditionalBehaviors: [{ if: '宋金交兵', then: '边市勒索' }]
        }
      ]
    };
  }
};
context.window = context;
context.globalThis = context;
vm.createContext(context);
vm.runInContext(source.slice(start, end), context, { filename: 'tm-endturn-core.bridge.js' });

const bridge = context.TM.FactionAiMainloopBridge;
assert(bridge, 'bridge namespace missing');

const factions = bridge.collectFactionContexts(context.GM, context.P, { limit: 10 });
const jin = factions.find((f) => f.name === 'Jin');
assert(jin, 'jin context missing');
assert.strictEqual(jin.state.strength, 70, 'jin live strength not merged');
assert.strictEqual(jin.ai.aiPersonality, '强攻与威慑并用', 'jin ai personality not merged');
assert(factions.some((f) => f.name === 'Xixia' && f.hasAi), 'xixia ai context missing');

const prompt = bridge.formatForPrompt(context.GM, context.P, { limit: 10 });
assert(prompt.includes('Faction AI Mainloop Bridge'), 'prompt title missing');
assert(prompt.includes('faction_ai_outcomes'), 'outcome field missing from prompt');
assert(prompt.includes('Jin'), 'jin missing from prompt');
assert(prompt.includes('aiPersonality'), 'ai key missing from prompt');
assert(prompt.includes('recordTarget'), 'record target routing missing');
assert(prompt.includes('shizhengji/houren/both/none'), 'shizhengji/houren routing missing');

const frags = context.EndTurnHooks.collectFragments({});
assert(frags.some((f) => f.name === 'faction-ai-mainloop-bridge' && f.text.includes('faction_ai_outcomes')), 'hook fragment missing');

const applied = bridge.applyTurnOutcomes(context.GM, {
  faction_ai_outcomes: [{
    faction: 'Jin',
    factionId: 'fac_jin',
    intent: '夺取河间转运主动权',
    action: '整顿河间转运廊道',
    target: '河北东路',
    result: '金军转运效率提高',
    publicSummary: '金整顿河间转运廊道，边境馈运更急。',
    posterityComment: '河间军吏夜传檄书，士民闻之色变。',
    recordTarget: 'both',
    structuralLinks: ['faction_events[0]']
  }]
}, { source: 'smoke' });
assert(applied.shizhengjiAppend.includes('金整顿河间转运廊道'), 'shizhengji append missing');
assert(applied.hourenAppend.includes('河间军吏夜传檄书'), 'houren append missing');
assert.strictEqual(context.GM._factionAiMainloopLedger.length, 1, 'ledger not written');
assert(context.GM._factionUndercurrents.length >= 1, 'undercurrent not written');
assert(context.GM._turnReport.some((r) => r.type === 'faction_ai'), 'turn report not written');
assert(context.__eb.some((x) => x.type === '势力AI'), 'event board not written');
assert(context.__feng.length === 1, 'fengwen not written');
assert(bridge.formatRecentOutcomesForNarrative(context.GM).includes('金整顿河间转运廊道'), 'recent narrative missing');

console.log('[smoke-faction-ai-mainloop-bridge] ok');
