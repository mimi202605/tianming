#!/usr/bin/env node
// scripts/smoke-player-movement.js — Phase 4.5·Task 21 玩家自由移动系统 smoke
// 验证：TM.PlayerMovement.{getState, getCurrentLocation, getDiscoveredLocations,
//   isTraveling, getAvailableActions, travelTo, advanceTravel, cancelTravel,
//   getAllModes, getModeConfig, canUseRelay, triggerTravelEvent,
//   bringEntourage, computeEntourageCost, classifyLocation, discoverLocation,
//   computeRouteDistance, estimateTravelTime, estimateTravelCost, renderMovementPanel}
//   - 5 种移动方式速度/成本不同
//   - 驿站方式需官场关系
//   - 移动事件触发（mock LLM·降级文本）
//   - 地点决定动作集（京城/地方/封国/边疆/名胜/敌国化外）
//   - 携随从成本加成

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

function buildContext() {
  var ctx = {
    console: { log: function(){}, warn: function(){}, error: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = {};
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(ROOT, 'tm-player-movement.js'), 'utf8'), ctx, { filename: 'tm-player-movement.js' });
  return ctx;
}

function setupCtx(ctx, opts) {
  opts = opts || {};
  ctx.GM = {
    turn: 10,
    chars: [
      { name: '测试君主', alive: true, officialTitle: '皇帝', role: '皇帝', isEmperor: true, location: '京城' },
      { name: '测试臣', alive: true, officialTitle: '尚书', role: '官员', rankLevel: 3, location: '京城', isPlayer: true }
    ]
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: opts.playerRole || 'minister',
      characterName: '测试臣',
      sovereignName: '测试君主',
      money: 1000,
      energy: 100,
      officialRelation: opts.officialRelation
    }
  };
  ctx.uid = function() { return 'smoke-uid-' + Math.random().toString(36).slice(2,8); };
  ctx.toast = function() {};
  ctx.addEB = function() {};
  ctx.getTurnDays = function() { return 30; };
  // 不挂 callAI：触发降级 mock 路径
  ctx.callAI = undefined;
}

// ────────────────────────────────────────────────────────────
//  §1 命名空间 + 状态查询
// ────────────────────────────────────────────────────────────
function namespaceTest(ctx) {
  setupCtx(ctx);
  assert(ctx.TM.PlayerMovement, 'namespace: TM.PlayerMovement 存在');
  assert(typeof ctx.TM.PlayerMovement.travelTo === 'function', 'namespace: travelTo 是函数');
  assert(typeof ctx.TM.PlayerMovement.MODES === 'object', 'namespace: MODES 常量');
  assert(typeof ctx.TM.PlayerMovement.LOCATION_TYPES === 'object', 'namespace: LOCATION_TYPES 常量');
}

function stateInitTest(ctx) {
  setupCtx(ctx);
  // 初始：currentLocation 应被 ensureState 兜底为空串
  var cur = ctx.TM.PlayerMovement.getCurrentLocation();
  assert(cur === '', 'state-init: currentLocation 为空');

  var disc = ctx.TM.PlayerMovement.getDiscoveredLocations();
  assert(Array.isArray(disc) && disc.length === 0, 'state-init: discoveredLocations 空数组');

  var trav = ctx.TM.PlayerMovement.isTraveling();
  assert(trav === false, 'state-init: 未在移动中');

  var st = ctx.TM.PlayerMovement.getState();
  assert(st && typeof st === 'object', 'state-init: getState 返回对象');
  assert(st.travelStatus && st.travelStatus.moving === false, 'state-init: travelStatus.moving=false');
}

function setCurrentLocationTest(ctx) {
  setupCtx(ctx);
  var ok = ctx.TM.PlayerMovement.setCurrentLocation('京城');
  assert(ok === true, 'setCurrentLocation: ok');
  assert(ctx.TM.PlayerMovement.getCurrentLocation() === '京城', 'setCurrentLocation: currentLocation = 京城');
  // 同步玩家角色 location 字段
  var ch = ctx.GM.chars[1];
  assert(ch.location === '京城', 'setCurrentLocation: 玩家角色 location 同步');
  // 自动加入已发现
  var disc = ctx.TM.PlayerMovement.getDiscoveredLocations();
  assert(disc.indexOf('京城') !== -1, 'setCurrentLocation: 自动加入 discoveredLocations');
}

// ────────────────────────────────────────────────────────────
//  §2 5 种移动方式速度/成本不同
// ────────────────────────────────────────────────────────────
function fiveModesTest(ctx) {
  setupCtx(ctx);
  var modes = ctx.TM.PlayerMovement.getAllModes();
  var keys = Object.keys(modes);
  assert(keys.length === 5, 'five-modes: 5 种方式·实际 ' + keys.length);
  ['walk', 'horse', 'carriage', 'boat', 'relay'].forEach(function(k) {
    assert(modes[k], 'five-modes: 含 ' + k);
    assert(typeof modes[k].speed === 'number', 'five-modes: ' + k + '.speed 是数字');
    assert(typeof modes[k].costPerTile === 'number', 'five-modes: ' + k + '.costPerTile 是数字');
  });

  // 速度差异：relay > boat > horse > carriage > walk
  assert(modes.relay.speed > modes.walk.speed, 'five-modes: relay 速度 > walk');
  assert(modes.boat.speed > modes.horse.speed, 'five-modes: boat 速度 > horse');
  assert(modes.horse.speed > modes.carriage.speed, 'five-modes: horse 速度 > carriage');
  assert(modes.carriage.speed > modes.walk.speed, 'five-modes: carriage 速度 > walk');

  // 成本差异：carriage 单位最贵
  assert(modes.carriage.costPerTile > modes.walk.costPerTile, 'five-modes: carriage 成本 > walk');
  // 驿站速度最快·成本最低（官府负担）
  assert(modes.relay.costPerTile < modes.horse.costPerTile, 'five-modes: relay 成本 < horse');
}

function modeConfigTest(ctx) {
  setupCtx(ctx);
  var m = ctx.TM.PlayerMovement.getModeConfig('horse');
  assert(m && m.id === 'horse', 'mode-config: horse.id');
  assert(m.label === '骑马', 'mode-config: horse.label');
  var none = ctx.TM.PlayerMovement.getModeConfig('bogus');
  assert(none === null, 'mode-config: 未知 mode 返回 null');
}

function estimateTimeCostTest(ctx) {
  setupCtx(ctx);
  // 自定义路径：京城→江南·距离 5 领
  ctx.P.customRoutes = { '京城→江南': { distance: 5, path: ['京城', '某渡', '江南'] } };
  // walk
  var tw = ctx.TM.PlayerMovement.estimateTravelTime('京城', '江南', 'walk');
  assert(tw.distance === 5, 'estimate-time: walk 距离 5');
  assert(tw.days > 0 && tw.turns > 0, 'estimate-time: walk 有耗时');
  // horse 应比 walk 快
  var th = ctx.TM.PlayerMovement.estimateTravelTime('京城', '江南', 'horse');
  assert(th.days < tw.days, 'estimate-time: horse 比 walk 快');
  // relay 应最快
  var tr = ctx.TM.PlayerMovement.estimateTravelTime('京城', '江南', 'relay');
  assert(tr.days <= th.days, 'estimate-time: relay 不慢于 horse');

  // 成本
  var cw = ctx.TM.PlayerMovement.estimateTravelCost('京城', '江南', 'walk');
  var ch = ctx.TM.PlayerMovement.estimateTravelCost('京城', '江南', 'horse');
  assert(ch.money > cw.money, 'estimate-cost: horse 比 walk 贵');
  assert(cw.money > 0 && cw.energy > 0, 'estimate-cost: walk 有正成本');
}

// ────────────────────────────────────────────────────────────
//  §3 驿站方式需官场关系
// ────────────────────────────────────────────────────────────
function relayRelationTest(ctx) {
  // 官场关系 = 30（不足）→ 不可用驿站
  setupCtx(ctx, { officialRelation: 30, playerRole: 'commoner' });
  var r1 = ctx.TM.PlayerMovement.canUseRelay();
  assert(r1.can === false, 'relay-relation: 官场关系不足·不可用驿站');
  assert(/官场关系不足/.test(r1.reason), 'relay-relation: reason 含"官场关系不足"');

  // 官场关系 = 80（充足）→ 可用
  setupCtx(ctx, { officialRelation: 80, playerRole: 'commoner' });
  var r2 = ctx.TM.PlayerMovement.canUseRelay();
  assert(r2.can === true, 'relay-relation: 官场关系充足·可用驿站');
  assert(r2.score === 80, 'relay-relation: score=80');

  // 身份豁免：minister 直通
  setupCtx(ctx, { officialRelation: 0, playerRole: 'minister' });
  var r3 = ctx.TM.PlayerMovement.canUseRelay();
  assert(r3.can === true, 'relay-relation: minister 身份豁免');
  assert(r3.byRole === true, 'relay-relation: byRole=true');
}

function relayTravelDeniedTest(ctx) {
  // 官场关系不足·travelTo relay 应被拒
  setupCtx(ctx, { officialRelation: 20, playerRole: 'commoner' });
  ctx.TM.PlayerMovement.setCurrentLocation('京城');
  ctx.P.customRoutes = { '京城→江南': { distance: 5, path: ['京城', '江南'] } };
  var r = ctx.TM.PlayerMovement.travelTo('江南', 'relay');
  assert(r.ok === false, 'relay-denied: travelTo relay 被拒');
  assert(r.code === 'relay-denied' || /驿站/.test(r.reason), 'relay-denied: code/reason');

  // 关系充足·travelTo relay 应通过
  setupCtx(ctx, { officialRelation: 80, playerRole: 'commoner' });
  ctx.TM.PlayerMovement.setCurrentLocation('京城');
  ctx.P.customRoutes = { '京城→江南': { distance: 5, path: ['京城', '江南'] } };
  var r2 = ctx.TM.PlayerMovement.travelTo('江南', 'relay');
  assert(r2.ok === true, 'relay-ok: travelTo relay 通过');
  assert(r2.mode === 'relay', 'relay-ok: mode=relay');
}

// ────────────────────────────────────────────────────────────
//  §4 移动事件触发（mock LLM）
// ────────────────────────────────────────────────────────────
function travelEventTest(ctx) {
  setupCtx(ctx);
  ctx.TM.PlayerMovement.setCurrentLocation('京城');
  ctx.P.customRoutes = { '京城→江南': { distance: 5, path: ['京城', '江南'] } };
  var r = ctx.TM.PlayerMovement.travelTo('江南', 'horse');
  assert(r.ok === true, 'event: travelTo horse ok');

  // 强制触发各类事件
  ['bandit', 'weather', 'encounter', 'relic'].forEach(function(type) {
    var evt = ctx.TM.PlayerMovement.triggerTravelEvent({ forceType: type, from: '京城', to: '江南', mode: 'horse' });
    assert(evt, 'event: ' + type + ' 触发');
    assert(evt.type === type, 'event: ' + type + '.type');
    assert(typeof evt.text === 'string' && evt.text.length > 0, 'event: ' + type + '.text 非空');
    assert(evt.source === 'mock', 'event: ' + type + '.source=mock（无 LLM 时降级）');
    assert(evt.effect && typeof evt.effect === 'object', 'event: ' + type + '.effect 是对象');
  });

  // 标题
  var t = ctx.TM.PlayerMovement.triggerTravelEvent({ forceType: 'bandit' });
  assert(/盗匪/.test(t.title), 'event: bandit title 含"盗匪"');
  var w = ctx.TM.PlayerMovement.triggerTravelEvent({ forceType: 'weather' });
  assert(/天时|天气/.test(w.title), 'event: weather title');
  var e = ctx.TM.PlayerMovement.triggerTravelEvent({ forceType: 'encounter' });
  assert(/偶遇/.test(e.title), 'event: encounter title 含"偶遇"');
  var rc = ctx.TM.PlayerMovement.triggerTravelEvent({ forceType: 'relic' });
  assert(/古迹/.test(rc.title), 'event: relic title 含"古迹"');
}

function travelEventEffectTest(ctx) {
  setupCtx(ctx);
  var b = ctx.TM.PlayerMovement.triggerTravelEvent({ forceType: 'bandit' });
  assert(typeof b.effect.money === 'number' && b.effect.money < 0, 'event-effect: bandit 扣银钱');
  assert(typeof b.effect.energy === 'number' && b.effect.energy < 0, 'event-effect: bandit 扣精力');

  var w = ctx.TM.PlayerMovement.triggerTravelEvent({ forceType: 'weather' });
  assert(typeof w.effect.days === 'number' && w.effect.days > 0, 'event-effect: weather 加时日');

  var r = ctx.TM.PlayerMovement.triggerTravelEvent({ forceType: 'relic' });
  assert(typeof r.effect.learning === 'number' && r.effect.learning > 0, 'event-effect: relic 加学识');
}

function travelEventLLMMockTest(ctx) {
  // 挂一个 mock callAI·返回固定文本·验证 source=llm
  setupCtx(ctx);
  ctx.callAI = function(prompt, max) { return '【mock-LLM】山道遇盗·路险马迟·失银若干。'; };
  var evt = ctx.TM.PlayerMovement.triggerTravelEvent({ forceType: 'bandit', from: '京城', to: '江南', mode: 'horse' });
  assert(evt.source === 'llm', 'event-llm: source=llm');
  assert(/mock-LLM/.test(evt.text), 'event-llm: 文本来自 mock callAI');
}

// ────────────────────────────────────────────────────────────
//  §5 地点决定动作集
// ────────────────────────────────────────────────────────────
function classifyLocationTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;
  assert(PM.classifyLocation('京城') === 'capital', 'classify: 京城 → capital');
  assert(PM.classifyLocation('京师') === 'capital', 'classify: 京师 → capital');
  assert(PM.classifyLocation('杭州') === 'province', 'classify: 杭州 → province（地方）');
  assert(PM.classifyLocation('某封国') === 'fief', 'classify: 某封国 → fief');
  assert(PM.classifyLocation('北疆边镇') === 'frontier', 'classify: 北疆边镇 → frontier');
  assert(PM.classifyLocation('泰山名胜') === 'scenic', 'classify: 泰山名胜 → scenic');
  assert(PM.classifyLocation('敌国化外') === 'foreign', 'classify: 敌国化外 → foreign');

  // 剧本 hook 优先
  ctx.P.locationTypes = { '洛阳': 'capital' };
  assert(PM.classifyLocation('洛阳') === 'capital', 'classify: locationTypes hook 优先');

  // 空串兜底
  assert(PM.classifyLocation('') === 'province', 'classify: 空串兜底 province');
}

function actionsByLocationTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;

  var cap = PM.getAvailableActions('京城');
  assert(cap.length >= 3, 'actions: 京城 至少 3 个动作');
  var capLabels = cap.map(function(a){ return a.label; }).join(',');
  assert(/上朝/.test(capLabels), 'actions: 京城 含"上朝"');
  assert(/朝议/.test(capLabels), 'actions: 京城 含"朝议"');

  var prov = PM.getAvailableActions('杭州');
  assert(prov.length >= 3, 'actions: 地方 至少 3 个动作');
  var provLabels = prov.map(function(a){ return a.label; }).join(',');
  assert(/治理辖区/.test(provLabels), 'actions: 地方 含"治理辖区"');

  var fief = PM.getAvailableActions('某封国');
  var fiefLabels = fief.map(function(a){ return a.label; }).join(',');
  assert(/治理封国/.test(fiefLabels), 'actions: 封国 含"治理封国"');
  assert(/练兵/.test(fiefLabels), 'actions: 封国 含"练兵"');

  var front = PM.getAvailableActions('北疆');
  var frontLabels = front.map(function(a){ return a.label; }).join(',');
  assert(/巡视边防/.test(frontLabels), 'actions: 边疆 含"巡视边防"');
  assert(/招揽边将/.test(frontLabels), 'actions: 边疆 含"招揽边将"');

  var scen = PM.getAvailableActions('某名胜');
  var scenLabels = scen.map(function(a){ return a.label; }).join(',');
  assert(/游学/.test(scenLabels), 'actions: 名胜 含"游学"');
  assert(/招揽名士/.test(scenLabels), 'actions: 名胜 含"招揽名士"');

  var foreign = PM.getAvailableActions('某敌国');
  var fLabels = foreign.map(function(a){ return a.label; }).join(',');
  assert(/外交事件|通缉|庇护|走私/.test(fLabels), 'actions: 敌国化外 含任一风险/外交动作');
}

// ────────────────────────────────────────────────────────────
//  §6 携随从成本加成
// ────────────────────────────────────────────────────────────
function entourageCostTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;
  ctx.P.customRoutes = { '京城→江南': { distance: 5, path: ['京城', '江南'] } };

  // 无随从
  var c0 = PM.estimateTravelCost('京城', '江南', 'walk', { entourageSize: 0 });
  // 小队 10 人
  var c10 = PM.estimateTravelCost('京城', '江南', 'walk', { entourageSize: 10 });
  // 中队 50 人
  var c50 = PM.estimateTravelCost('京城', '江南', 'walk', { entourageSize: 50 });
  // 大队 200 人
  var c200 = PM.estimateTravelCost('京城', '江南', 'walk', { entourageSize: 200 });
  // 庞大 500 人
  var c500 = PM.estimateTravelCost('京城', '江南', 'walk', { entourageSize: 500 });

  assert(c10.money >= c0.money, 'entourage: 10人 成本 ≥ 无随从');
  assert(c50.money > c10.money, 'entourage: 50人 > 10人');
  assert(c200.money > c50.money, 'entourage: 200人 > 50人');
  assert(c500.money > c200.money, 'entourage: 500人 > 200人');
}

function bringEntourageTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;
  var e = PM.bringEntourage({ family: 3, privateArmy: 30, caravan: 10, servants: 5 });
  assert(e.ok === true, 'bring-entourage: ok');
  assert(e.size === 48, 'bring-entourage: 总数 48');
  assert(e.breakdown.family === 3, 'bring-entourage: family=3');
  assert(e.breakdown.privateArmy === 30, 'bring-entourage: privateArmy=30');
  assert(e.breakdown.caravan === 10, 'bring-entourage: caravan=10');
  assert(e.breakdown.servants === 5, 'bring-entourage: servants=5');

  // 空随从
  var e2 = PM.bringEntourage({});
  assert(e2.ok === false, 'bring-entourage: 空随从 ok=false');

  // computeEntourageCost
  var c = PM.computeEntourageCost({ family: 3, privateArmy: 30 }, 'walk');
  assert(c.size === 33, 'compute-entourage-cost: 总数 33');
  assert(c.scale >= 1.0, 'compute-entourage-cost: scale ≥ 1.0');

  // 车驾方式 capacityMul=1.6·随从加成应被部分抵消
  var cw = PM.computeEntourageCost({ privateArmy: 100 }, 'walk');
  var cc = PM.computeEntourageCost({ privateArmy: 100 }, 'carriage');
  assert(cc.scale <= cw.scale, 'compute-entourage-cost: 车驾 scale ≤ walk（容量抵消）');
}

function travelWithEntourageTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;
  PM.setCurrentLocation('京城');
  ctx.P.customRoutes = { '京城→江南': { distance: 5, path: ['京城', '江南'] } };

  var r = PM.travelTo('江南', 'horse', { family: 2, privateArmy: 20, servants: 3 });
  assert(r.ok === true, 'travel-entourage: ok');
  assert(r.entourage.size === 25, 'travel-entourage: 25 人随从');
  // 移动状态应记录 entourageSize
  var ts = PM.getTravelStatus();
  assert(ts.entourageSize === 25, 'travel-entourage: travelStatus.entourageSize=25');
}

// ────────────────────────────────────────────────────────────
//  §7 travelTo + advanceTravel + arrive 完整流程
// ────────────────────────────────────────────────────────────
function travelFlowTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;
  PM.setCurrentLocation('京城');
  ctx.P.customRoutes = { '京城→江南': { distance: 6, path: ['京城', '某渡', '江南'] } };

  var r = PM.travelTo('江南', 'horse');
  assert(r.ok === true, 'flow: travelTo ok');
  assert(r.status === 'moving', 'flow: status=moving');
  assert(r.to === '江南', 'flow: to=江南');
  assert(PM.isTraveling() === true, 'flow: isTraveling=true');

  var ts = PM.getTravelStatus();
  assert(ts.from === '京城', 'flow: from=京城');
  assert(ts.to === '江南', 'flow: to=江南');
  assert(ts.mode === 'horse', 'flow: mode=horse');
  assert(ts.eta > ctx.GM.turn, 'flow: eta > 当前 turn');

  // 推进至到达
  var arrived = false;
  for (var i = 0; i < ts.totalTurns + 2; i++) {
    var adv = PM.advanceTravel();
    if (adv.status === 'arrived') { arrived = true; break; }
  }
  assert(arrived, 'flow: advanceTravel 最终 arrived');

  // 到达后状态归零
  assert(PM.isTraveling() === false, 'flow: 到达后 isTraveling=false');
  assert(PM.getCurrentLocation() === '江南', 'flow: 到达后 currentLocation=江南');

  // 已发现地点含目的地
  var disc = PM.getDiscoveredLocations();
  assert(disc.indexOf('江南') !== -1, 'flow: 江南 已发现');
  assert(disc.indexOf('京城') !== -1, 'flow: 京城 已发现');
}

function travelRepeatDeniedTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;
  PM.setCurrentLocation('京城');
  ctx.P.customRoutes = { '京城→江南': { distance: 6, path: ['京城', '江南'] } };

  var r1 = PM.travelTo('江南', 'horse');
  assert(r1.ok === true, 'repeat: 第一次 travelTo ok');
  var r2 = PM.travelTo('江南', 'horse');
  assert(r2.ok === false, 'repeat: 第二次 travelTo 拒绝');
  assert(/已在移动中/.test(r2.reason), 'repeat: reason 含"已在移动中"');
}

function travelSameLocationTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;
  PM.setCurrentLocation('京城');
  var r = PM.travelTo('京城', 'walk');
  assert(r.ok === true, 'same-loc: 同地 travelTo ok');
  assert(r.status === 'arrived', 'same-loc: 直接 arrived');
  assert(PM.getCurrentLocation() === '京城', 'same-loc: location 不变');
}

function cancelTravelTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;
  PM.setCurrentLocation('京城');
  ctx.P.customRoutes = { '京城→江南': { distance: 6, path: ['京城', '某渡', '江南'] } };
  var r = PM.travelTo('江南', 'horse');
  assert(r.ok === true, 'cancel: travelTo ok');

  // 未在移动中·cancel 应拒绝
  PM.advanceTravel();  // 推进一回合（仍在移动中）
  var c = PM.cancelTravel();
  assert(c.ok === true, 'cancel: 移动中 cancel ok');
  assert(PM.isTraveling() === false, 'cancel: cancel 后 isTraveling=false');

  // 再次 cancel 应拒绝
  var c2 = PM.cancelTravel();
  assert(c2.ok === false, 'cancel: 非移动中 cancel 拒绝');
}

// ────────────────────────────────────────────────────────────
//  §8 路径距离计算
// ────────────────────────────────────────────────────────────
function routeDistanceTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;

  // 同地
  var d0 = PM.computeRouteDistance('京城', '京城');
  assert(d0.distance === 0, 'route: 同地距离 0');

  // 剧本 hook
  ctx.P.customRoutes = { '京城→江南': { distance: 5, path: ['京城', '某渡', '江南'] } };
  var d1 = PM.computeRouteDistance('京城', '江南');
  assert(d1.distance === 5, 'route: hook 距离 5');
  assert(d1.source === 'custom-hook', 'route: source=custom-hook');
  assert(d1.path.length === 3, 'route: path 3 节点');

  // 反向也算
  var d2 = PM.computeRouteDistance('江南', '京城');
  assert(d2.distance === 5, 'route: 反向距离 5');

  // 兜底估算
  delete ctx.P.customRoutes;
  var d3 = PM.computeRouteDistance('京城', '江南');
  assert(d3.distance > 0, 'route: 兜底距离 > 0');
  assert(d3.source === 'name-estimate', 'route: source=name-estimate');
}

// ────────────────────────────────────────────────────────────
//  §9 御案移动面板
// ────────────────────────────────────────────────────────────
function renderPanelTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;
  PM.setCurrentLocation('京城');
  var html = PM.renderMovementPanel();
  assert(typeof html === 'string' && html.length > 100, 'render: 返回 HTML 字符串');
  assert(/自由移动/.test(html), 'render: 含"自由移动"标题');
  assert(/现居/.test(html), 'render: 含"现居"');
  assert(/发起远行/.test(html), 'render: 含"发起远行"');
  assert(/步行/.test(html) && /骑马/.test(html), 'render: 含 5 种方式');
  assert(/上朝/.test(html), 'render: 京城动作集 含"上朝"');
  assert(/已发现地点/.test(html), 'render: 含"已发现地点"');

  // 渲染到目标元素
  var fakeEl = { innerHTML: '' };
  var r = PM.renderMovementPanel(fakeEl);
  assert(r === null, 'render: 传入 targetEl 返回 null');
  assert(fakeEl.innerHTML.length > 100, 'render: targetEl.innerHTML 已写入');
}

// ────────────────────────────────────────────────────────────
//  §10 boat 水路校验
// ────────────────────────────────────────────────────────────
function boatWaterRouteTest(ctx) {
  setupCtx(ctx);
  var PM = ctx.TM.PlayerMovement;

  // ① 非水路（无江/河/湖/海等字）·boat 应被拒
  PM.setCurrentLocation('京城');
  ctx.P.customRoutes = { '京城→漠北': { distance: 8, path: ['京城', '漠北'] } };
  var r1 = PM.travelTo('漠北', 'boat');
  assert(r1.ok === false, 'boat: 非水路 boat 被拒');
  assert(r1.code === 'no-water-route', 'boat: code=no-water-route');

  // ② 水路（含江字）·boat 应通过
  setupCtx(ctx);
  PM = ctx.TM.PlayerMovement;
  PM.setCurrentLocation('京城');
  ctx.P.customRoutes = { '京城→江南': { distance: 5, path: ['京城', '江南'] } };
  var r2 = PM.travelTo('江南', 'boat');
  assert(r2.ok === true, 'boat: 水路 boat 通过');
  assert(r2.mode === 'boat', 'boat: mode=boat');

  // ③ P.waterRoutes 显式 hook（让无水字的地名也算水路）
  setupCtx(ctx);
  PM = ctx.TM.PlayerMovement;
  PM.setCurrentLocation('京城');
  ctx.P.customRoutes = { '京城→漠北': { distance: 8, path: ['京城', '漠北'] } };
  ctx.P.waterRoutes = { '京城→漠北': true };
  var r3 = PM.travelTo('漠北', 'boat');
  assert(r3.ok === true, 'boat: waterRoutes hook 显式水路 通过');
}

// ────────────────────────────────────────────────────────────
//  §11 跨朝代铁律·零明清专名（在 smoke 内做精简自检·正式 grep 见主控验证）
// ────────────────────────────────────────────────────────────
function dynastyNeutralSelfCheck(ctx) {
  var src = fs.readFileSync(path.join(ROOT, 'tm-player-movement.js'), 'utf8');
  // 明清专名黑名单
  var banned = ['内阁', '票拟', '司礼监', '东厂', '西厂', '八股', '锦衣卫', '军机处', '奏折', '科道'];
  var hits = [];
  banned.forEach(function(w) {
    if (src.indexOf(w) !== -1) hits.push(w);
  });
  assert(hits.length === 0, 'dynasty-neutral: 不含明清专名（命中：' + hits.join(',') + '）');
}

// ────────────────────────────────────────────────────────────
//  主流程
// ────────────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  namespaceTest(ctx);
  stateInitTest(ctx);
  setCurrentLocationTest(ctx);
  fiveModesTest(ctx);
  modeConfigTest(ctx);
  estimateTimeCostTest(ctx);
  relayRelationTest(ctx);
  relayTravelDeniedTest(ctx);
  travelEventTest(ctx);
  travelEventEffectTest(ctx);
  travelEventLLMMockTest(ctx);
  classifyLocationTest(ctx);
  actionsByLocationTest(ctx);
  entourageCostTest(ctx);
  bringEntourageTest(ctx);
  travelWithEntourageTest(ctx);
  travelFlowTest(ctx);
  travelRepeatDeniedTest(ctx);
  travelSameLocationTest(ctx);
  cancelTravelTest(ctx);
  routeDistanceTest(ctx);
  renderPanelTest(ctx);
  boatWaterRouteTest(ctx);
  dynastyNeutralSelfCheck(ctx);
  console.log('[smoke-player-movement] PASS · 24 sub-tests · TM.PlayerMovement 完整覆盖（5 方式/驿站官场/事件/地点动作集/随从加成/水路/面板/跨朝代）');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-movement] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
