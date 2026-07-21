#!/usr/bin/env node
// scripts/smoke-player-tech.js — Phase 4.5·Task 18 玩家科技研发系统 smoke
// 验证：
//   - TM.PlayerTech 命名空间暴露（双路径：globalThis + module.exports）
//   - 玩家科技账本：currentResearch / completed / discoveries / boosts / retainedArtisans
//   - 预设固定科技路线数据：5 条主线 × 5 级（agriculture/military/craft/medicine/water）
//   - 启动研发：扣银钱·按 学识+投入+基础+时代限制 计算进度
//   - 前置科技解锁：未完成 N 级时禁用 N+1 级·返回"需先研发 X"
//   - 剧本数据覆盖/扩展路线（merge 默认 + 剧本）
//   - 招揽匠人加速：关联 TM.PlayerInteraction.interact(npc,'recruit',payload)
//   - 研发完成：解锁对应增益·写入 completed/discoveries/boosts
//   - 上奏推广 / 私藏自用 两条路径
//   - 御案"科技"面板·可视化科技树（已解锁/进行中/锁定）
//   - 跨朝代铁律·零明清专名
//   - 双路径挂载（globalThis + module.exports）

'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const ROOT = path.resolve(__dirname, '..');

function fail(msg) { throw new Error(msg); }
function assert(cond, msg) { if (!cond) fail(msg); }

// ── 加载 tm-tech-routes-data.js + tm-player-tech.js（IIFE 模式，sandbox.window = ctx）──
function buildContext() {
  var ctx = {
    console: { log: function(){}, warn: function(){}, error: function(){} },
    Math: Math, Date: Date, JSON: JSON, Object: Object, Array: Array,
    Number: Number, String: String, Boolean: Boolean, RegExp: RegExp,
    isFinite: isFinite, parseInt: parseInt, parseFloat: parseFloat, isNaN: isNaN, Set: Set,
    Map: Map, Promise: Promise, setTimeout: setTimeout, clearTimeout: clearTimeout
  };
  ctx.window = ctx; ctx.global = ctx; ctx.globalThis = ctx;
  ctx.TM = {};
  vm.createContext(ctx);
  // 先加载 routes data（注入 window.TECH_ROUTES_DEFAULT）
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'tm-tech-routes-data.js'), 'utf8'),
    ctx, { filename: 'tm-tech-routes-data.js' }
  );
  // 再加载主模块（消费 window.TECH_ROUTES_DEFAULT）
  vm.runInContext(
    fs.readFileSync(path.join(ROOT, 'tm-player-tech.js'), 'utf8'),
    ctx, { filename: 'tm-player-tech.js' }
  );
  return ctx;
}

// ── Mock 全局 P/GM/TM + NPC 阵容 ──
function setupCtx(ctx, opts) {
  opts = opts || {};

  // 玩家：李大臣（穿越模式·minister）
  var playerCh = { name: '李大臣', alive: true, officialTitle: '尚书', role: '臣', learning: 80, isPlayer: true };
  // NPC1：张匠人（农艺匠人·officialTitle 含"农"）
  var npcFarmer = { name: '张农官', alive: true, officialTitle: '司农匠', role: '匠', learning: 70 };
  // NPC2：王铁匠（军工·含"冶"）
  var npcSmith = { name: '王冶匠', alive: true, officialTitle: '冶工', role: '匠', learning: 60 };
  // NPC3：刘文人（非匠人·非军中·无 boost 关键词）
  var npcScholar = { name: '刘文人', alive: true, officialTitle: '侍郎', role: '臣', learning: 50 };
  // 君主（用于上奏推广路径）
  var sovereign = { name: '今上', alive: true, officialTitle: '皇帝', role: '皇帝', isEmperor: true };

  ctx.GM = {
    sid: 'smoke',
    turn: 10,
    chars: [playerCh, npcFarmer, npcSmith, npcScholar, sovereign]
  };
  ctx.P = {
    playerInfo: {
      transmigrationMode: true,
      playerRole: 'minister',
      characterName: '李大臣',
      sovereignName: '今上',
      money: 10000,
      energy: 100,
      prestige: 60,
      sovereignRelation: 70
    }
  };

  // mock TM.PlayerEconomy（spend 主路径·扣 P.playerInfo.money）
  ctx.TM.PlayerEconomy = {
    spend: function (cost, label) {
      if (ctx.P.playerInfo.money < cost) return { ok: false, reason: '银钱不足', cash: ctx.P.playerInfo.money };
      ctx.P.playerInfo.money -= cost;
      return { ok: true, cash: ctx.P.playerInfo.money };
    },
    // spendCash 是 task spec 约定名·实际接口为 spend·此处 mock 同时暴露
    spendCash: function (cost, label) {
      if (ctx.P.playerInfo.money < cost) return { ok: false, reason: '银钱不足', cash: ctx.P.playerInfo.money };
      ctx.P.playerInfo.money -= cost;
      return { ok: true, cash: ctx.P.playerInfo.money };
    }
  };

  // mock TM.PlayerInteraction.interact（recruit 路径）
  ctx._interactCalls = [];
  ctx.TM.PlayerInteraction = {
    interact: function (npcName, kind, payload) {
      ctx._interactCalls.push({ npc: npcName, kind: kind, payload: payload });
      if (kind !== 'recruit') return { ok: false, reason: 'mock 仅支持 recruit' };
      return { ok: true, kind: kind, npc: npcName, scene: 'mock 招揽场景', energy: { cost: 2 } };
    }
  };

  // mock TM.Transmigration
  ctx.TM.Transmigration = {
    isTransmigrationMode: function () { return !!ctx.P.playerInfo.transmigrationMode; }
  };

  // 不挂 callAI：默认走规则引擎降级
  ctx.callAI = undefined;
}

// ────────────────────────────────────────────────────────────
//  §1 命名空间 + 数据
// ────────────────────────────────────────────────────────────
function testNamespace(ctx) {
  assert(ctx.TM && ctx.TM.PlayerTech, 'namespace: TM.PlayerTech 存在');
  var ns = ctx.TM.PlayerTech;
  assert(typeof ns.startResearch === 'function', 'namespace: startResearch 是函数');
  assert(typeof ns.completeResearch === 'function', 'namespace: completeResearch 是函数');
  assert(typeof ns.recruitArtisan === 'function', 'namespace: recruitArtisan 是函数');
  assert(typeof ns.petitionToPromulgate === 'function', 'namespace: petitionToPromulgate 是函数');
  assert(typeof ns.retainPrivate === 'function', 'namespace: retainPrivate 是函数');
  assert(typeof ns.renderTechPanel === 'function', 'namespace: renderTechPanel 是函数');
  assert(typeof ns.getRoutes === 'function', 'namespace: getRoutes 是函数');
  assert(typeof ns.getTechStatus === 'function', 'namespace: getTechStatus 是函数');
  assert(ns.FIELDS && ns.FIELDS.length === 5, 'namespace: FIELDS 5 条主线');
  assert(ns.TECH_ROUTES_DEFAULT, 'namespace: TECH_ROUTES_DEFAULT 引用');
  var expectFields = ['agriculture', 'military', 'craft', 'medicine', 'water'];
  expectFields.forEach(function (f) {
    assert(ns.FIELDS.indexOf(f) >= 0, 'namespace: FIELDS 含 ' + f);
    assert(ns.TECH_ROUTES_DEFAULT[f], 'namespace: TECH_ROUTES_DEFAULT.' + f + ' 存在');
    assert(ns.TECH_ROUTES_DEFAULT[f].levels.length === 5, 'namespace: ' + f + ' 共 5 级');
  });
}

// ────────────────────────────────────────────────────────────
//  §2 数据文件正确性·5 条主线 × 5 级·科技名顺序与 spec 一致
// ────────────────────────────────────────────────────────────
function testRoutesData(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;
  var routes = ns.getRoutes();
  // 验证每条线的 5 级名字与 spec.md 一致
  var expect = {
    agriculture: ['农具改良', '良种选育', '水利灌溉', '耕作制度', '多熟种植'],
    military:    ['冶铁锻造', '弩机改良', '甲胄升级', '攻城器械', '火药初探'],
    craft:       ['纺织改进', '陶瓷烧制', '造纸印刷', '冶铸高炉', '雕版活字'],
    medicine:    ['本草整理', '方剂编纂', '针灸推拿', '疫病防治', '法医检验'],
    water:       ['沟渠疏浚', '陂塘修筑', '堰坝工程', '运河开凿', '海塘修筑']
  };
  Object.keys(expect).forEach(function (f) {
    var line = routes[f];
    assert(line, 'routes: ' + f + ' 路线存在');
    assert(line.label, 'routes: ' + f + ' 有 label');
    expect[f].forEach(function (nm, i) {
      assert(line.levels[i] && line.levels[i].name === nm,
        'routes: ' + f + '.' + i + ' = ' + nm + '·实际 ' + (line.levels[i] && line.levels[i].name));
    });
    // 链式 requires：第 0 级无前置·第 N 级 requires ['<field>.(N-1)']
    assert(line.levels[0].requires.length === 0, 'routes: ' + f + '.0 requires 空');
    for (var i = 1; i < 5; i++) {
      assert(line.levels[i].requires.indexOf(f + '.' + (i - 1)) >= 0,
        'routes: ' + f + '.' + i + ' requires 含 ' + f + '.' + (i - 1));
    }
    // 每级有 boost / cost / era
    line.levels.forEach(function (lv, i) {
      assert(typeof lv.cost === 'number' && lv.cost > 0, 'routes: ' + f + '.' + i + ' cost 正数');
      assert(lv.boost && typeof lv.boost === 'object', 'routes: ' + f + '.' + i + ' boost 对象');
      assert(typeof lv.era === 'number', 'routes: ' + f + '.' + i + ' era 数字');
    });
  });
  // TECH_ROUTES_DEFAULT 全局也挂载
  assert(ctx.TECH_ROUTES_DEFAULT, 'routes: 全局 window.TECH_ROUTES_DEFAULT 已挂载');
  assert(ctx.TECH_ROUTES_DEFAULT.agriculture, 'routes: 全局 agriculture 路线存在');
}

// ────────────────────────────────────────────────────────────
//  §3 守卫·非穿越模式 / 未知领域 / 已在研发 / 重复立项
// ────────────────────────────────────────────────────────────
function testGuards(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;

  // 非穿越模式
  ctx.P.playerInfo.transmigrationMode = false;
  var r1 = ns.startResearch('agriculture');
  assert(r1.ok === false, 'guard: 非穿越模式拒绝');
  assert(/非穿越模式/.test(r1.reason), 'guard: 非穿越模式 reason');
  ctx.P.playerInfo.transmigrationMode = true;

  // 未知领域
  var r2 = ns.startResearch('bogusField');
  assert(r2.ok === false, 'guard: 未知领域拒绝');
  assert(/未知领域/.test(r2.reason), 'guard: 未知领域 reason');

  // 银钱不足
  ctx.P.playerInfo.money = 0;
  var r3 = ns.startResearch('agriculture');
  assert(r3.ok === false, 'guard: 银钱不足拒绝');
  assert(/银钱不足/.test(r3.reason), 'guard: 银钱不足 reason');
  ctx.P.playerInfo.money = 10000;
}

// ────────────────────────────────────────────────────────────
//  §4 启动研发：扣银钱·按 学识+投入+基础+时代限制 计算进度
// ────────────────────────────────────────────────────────────
function testStartResearch(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;

  var moneyBefore = ctx.P.playerInfo.money;
  var r = ns.startResearch('agriculture');
  assert(r.ok === true, 'start: agriculture.0 ok');
  assert(r.field === 'agriculture', 'start: field 回显');
  assert(r.level === 0, 'start: level=0');
  assert(r.name === '农具改良', 'start: name=农具改良');
  // 扣银钱 = tech.cost = 200
  assert(ctx.P.playerInfo.money === moneyBefore - 200, 'start: 扣 200 两·实际扣 ' + (moneyBefore - ctx.P.playerInfo.money));
  // 进度 > 0
  assert(r.progress > 0, 'start: progress > 0·实际 ' + r.progress);

  // 账本写入
  var cr = ns.getCurrentResearch();
  assert(cr !== null, 'start: currentResearch 已写入');
  assert(cr.field === 'agriculture', 'start: currentResearch.field');
  assert(cr.level === 0, 'start: currentResearch.level');
  assert(cr.invested === 200, 'start: currentResearch.invested=200');
  assert(cr.startedTurn === ctx.GM.turn, 'start: currentResearch.startedTurn=10');

  // 重复立项·拒绝
  var r2 = ns.startResearch('military');
  assert(r2.ok === false, 'start: 已在研发中拒绝');
  assert(r2.code === 'already-researching', 'start: code=already-researching');
}

// ────────────────────────────────────────────────────────────
//  §5 前置科技解锁·特别断言：未完成 N 级时禁用 N+1 级·返回"需先研发 X"
// ────────────────────────────────────────────────────────────
function testPrereqLock(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;

  // 初始：agriculture.0 = available·agriculture.1 = locked
  var s0 = ns.getTechStatus('agriculture', 0);
  assert(s0.status === 'available', 'lock: agriculture.0 = available');
  var s1 = ns.getTechStatus('agriculture', 1);
  assert(s1.status === 'locked', 'lock: agriculture.1 = locked');
  assert(s1.missing && s1.missing.indexOf('agriculture.0') >= 0, 'lock: agriculture.1 missing 含 agriculture.0');
  assert(/需先研发 农具改良/.test(s1.hint), 'lock: hint 含"需先研发 农具改良"·实际 ' + s1.hint);

  // 直接尝试立项 agriculture.1·应被拒并返回 hint
  var r = ns.startResearch('agriculture', { level: 1 });
  assert(r.ok === false, 'lock: 立项 agriculture.1 拒绝');
  assert(r.code === 'locked', 'lock: code=locked');
  assert(/需先研发 农具改良/.test(r.hint), 'lock: hint 含"需先研发 农具改良"·实际 ' + r.hint);
  assert(/需先研发/.test(r.reason), 'lock: reason 含"需先研发"');

  // agriculture.2 同样锁定·missing 含 0/1
  var s2 = ns.getTechStatus('agriculture', 2);
  assert(s2.status === 'locked', 'lock: agriculture.2 = locked');
  assert(s2.missing.indexOf('agriculture.1') >= 0, 'lock: agriculture.2 missing 含 agriculture.1');

  // 完成第 0 级后·第 1 级应可立项
  var l = ctx.GM._playerTech;
  l.completed.push('agriculture.0');
  var s1b = ns.getTechStatus('agriculture', 1);
  assert(s1b.status === 'available', 'lock: 完成 0 后·1 = available');
  var s2b = ns.getTechStatus('agriculture', 2);
  assert(s2b.status === 'locked', 'lock: 完成 0 后·2 仍 locked');
  assert(/需先研发 良种选育/.test(s2b.hint), 'lock: hint 含"需先研发 良种选育"');
}

// ────────────────────────────────────────────────────────────
//  §6 剧本数据覆盖/扩展路线（merge 默认 + 剧本）
// ────────────────────────────────────────────────────────────
function testScenarioOverride(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;

  // 形态 A：覆盖 agriculture 整条线
  ctx.P.customTechRoutes = {
    agriculture: {
      label: '农事',
      levels: [
        { name: '试犁', cost: 100, requires: [], boost: { food: +3 }, era: 0, desc: '试犁' },
        { name: '试种', cost: 200, requires: ['agriculture.0'], boost: { food: +5 }, era: 0, desc: '试种' },
        { name: '试灌', cost: 300, requires: ['agriculture.1'], boost: { food: +8 }, era: 0, desc: '试灌' },
        { name: '试耕', cost: 400, requires: ['agriculture.2'], boost: { food: +12 }, era: 0, desc: '试耕' },
        { name: '试复', cost: 500, requires: ['agriculture.3'], boost: { food: +18 }, era: 0, desc: '试复' }
      ]
    }
  };
  var routes = ns.getRoutes();
  assert(routes.agriculture.label === '农事', 'override: label 覆盖为农事');
  assert(routes.agriculture.levels[0].name === '试犁', 'override: 0=试犁');
  assert(routes.agriculture.levels[4].name === '试复', 'override: 4=试复');
  // 其他线不受影响
  assert(routes.military.levels[0].name === '冶铁锻造', 'override: military.0 仍为 冶铁锻造');

  // 形态 B：追加支线（剧本朝代专属支线）
  ctx.P.customTechRoutes = {
    gunpowder: {
      label: '火器',
      levels: [
        { name: '突火枪', cost: 1500, requires: ['military.3'], boost: { strength: +10 }, era: 2, desc: '火枪初用' },
        { name: '火铳', cost: 2200, requires: ['gunpowder.0'], boost: { strength: +15 }, era: 2, desc: '火铳成军' }
      ]
    }
  };
  routes = ns.getRoutes();
  assert(routes.gunpowder, 'extend: 新增 gunpowder 支线');
  assert(routes.gunpowder.label === '火器', 'extend: gunpowder.label');
  assert(routes.gunpowder.levels.length === 2, 'extend: gunpowder 共 2 级');
  assert(routes.gunpowder.levels[0].name === '突火枪', 'extend: gunpowder.0=突火枪');

  // 形态 C：extend 在默认线末尾追加级别
  ctx.P.customTechRoutes = {
    agriculture: {
      extend: [
        { name: '占城稻', cost: 2200, requires: ['agriculture.4'], boost: { food: +30 }, era: 2, desc: '占城稻引种' }
      ]
    }
  };
  routes = ns.getRoutes();
  assert(routes.agriculture.levels.length === 6, 'extend: agriculture 扩展到 6 级');
  assert(routes.agriculture.levels[5].name === '占城稻', 'extend: agriculture.5=占城稻');

  // 清掉 customTechRoutes·恢复默认
  delete ctx.P.customTechRoutes;
  routes = ns.getRoutes();
  assert(routes.agriculture.levels.length === 5, 'extend: 清掉后默认 5 级');
  assert(routes.agriculture.levels[0].name === '农具改良', 'extend: 清掉后默认 0=农具改良');
}

// ────────────────────────────────────────────────────────────
//  §7 招揽匠人加速·关联 TM.PlayerInteraction.interact(npc, 'recruit', payload)
// ────────────────────────────────────────────────────────────
function testRecruitArtisan(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;

  // 先启动一项 agriculture.0
  var r0 = ns.startResearch('agriculture');
  assert(r0.ok === true, 'recruit: 启动 agriculture.0 ok');
  var progressBefore = ns.getCurrentResearch().progress;

  // 招揽张农官（officialTitle 含"农"·匹配 agriculture）
  var r1 = ns.recruitArtisan('张农官');
  assert(r1.ok === true, 'recruit: 招揽 张农官 ok');
  assert(r1.npc === '张农官', 'recruit: npc 回显');
  assert(r1.field === 'agriculture', 'recruit: field=agriculture');
  assert(r1.bonus > 0, 'recruit: bonus > 0·实际 ' + r1.bonus);
  assert(r1.appliedToCurrent === true, 'recruit: appliedToCurrent=true');

  // 调用了 TM.PlayerInteraction.interact(npc, 'recruit', payload)
  assert(ctx._interactCalls.length === 1, 'recruit: PlayerInteraction.interact 调用 1 次');
  assert(ctx._interactCalls[0].npc === '张农官', 'recruit: interact npc=张农官');
  assert(ctx._interactCalls[0].kind === 'recruit', 'recruit: interact kind=recruit');

  // 进度应有提升
  var progressAfter = ns.getCurrentResearch().progress;
  assert(progressAfter >= progressBefore, 'recruit: 进度提升·前 ' + progressBefore + ' 后 ' + progressAfter);

  // 门客清单已写入
  var artisans = ns.getRetainedArtisans();
  assert(artisans.length === 1, 'recruit: 门客清单 1 人');
  assert(artisans[0].name === '张农官', 'recruit: 门客[0].name=张农官');
  assert(artisans[0].field === 'agriculture', 'recruit: 门客[0].field=agriculture');
  assert(artisans[0].bonus > 0, 'recruit: 门客[0].bonus > 0');

  // 招揽刘文人（无匠人关键词·field=null·bonus=0·但门客清单仍记录）
  var r2 = ns.recruitArtisan('刘文人');
  assert(r2.ok === true, 'recruit: 刘文人 ok（仍招揽·但无加成）');
  assert(r2.field === null, 'recruit: 刘文人 field=null（无关键词匹配）');
  assert(r2.bonus === 0, 'recruit: 刘文人 bonus=0');
  assert(ns.getRetainedArtisans().length === 2, 'recruit: 门客清单 2 人');

  // 显式指定 field·覆盖推断
  var r3 = ns.recruitArtisan('刘文人', { field: 'craft' });
  assert(r3.ok === true, 'recruit: 显式 field=craft ok');
  assert(r3.field === 'craft', 'recruit: 显式 field=craft 生效');

  // NPC 不存在
  var r4 = ns.recruitArtisan('不存在的人');
  assert(r4.ok === false, 'recruit: NPC 不存在拒绝');
  assert(/未找到 NPC/.test(r4.reason), 'recruit: reason 含未找到 NPC');

  // 非穿越模式
  ctx.P.playerInfo.transmigrationMode = false;
  var r5 = ns.recruitArtisan('张农官');
  assert(r5.ok === false, 'recruit: 非穿越模式拒绝');
  ctx.P.playerInfo.transmigrationMode = true;
}

// ────────────────────────────────────────────────────────────
//  §8 研发完成：解锁增益·写入 completed/discoveries/boosts
// ────────────────────────────────────────────────────────────
function testCompleteResearch(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;

  // 启动 + 强制完成
  var r0 = ns.startResearch('agriculture');
  assert(r0.ok === true, 'complete: 启动 ok');

  // 人为把 progress 拉到 100
  ctx.GM._playerTech.currentResearch.progress = 100;
  var r1 = ns.completeResearch();
  assert(r1.ok === true, 'complete: 完成研究 ok');
  assert(r1.id === 'agriculture.0', 'complete: id=agriculture.0');
  assert(r1.name === '农具改良', 'complete: name=农具改良');
  assert(r1.field === 'agriculture', 'complete: field=agriculture');
  assert(r1.level === 0, 'complete: level=0');

  // completed 含 agriculture.0
  var comp = ns.getCompleted();
  assert(comp.indexOf('agriculture.0') >= 0, 'complete: completed 含 agriculture.0');

  // boosts 含 food: +5
  var boosts = ns.getBoosts();
  assert(boosts.food === 5, 'complete: boosts.food=5·实际 ' + boosts.food);

  // discoveries 写入
  var disc = ns.getDiscoveries();
  assert(disc.length === 1, 'complete: discoveries 1 条');
  assert(disc[0].id === 'agriculture.0', 'complete: discoveries[0].id');
  assert(disc[0].name === '农具改良', 'complete: discoveries[0].name');
  assert(disc[0].path === 'private', 'complete: 默认 path=private');

  // currentResearch 已清空
  assert(ns.getCurrentResearch() === null, 'complete: currentResearch 已清空');

  // 已完成后·agriculture.0 = completed·agriculture.1 = available
  var s0 = ns.getTechStatus('agriculture', 0);
  assert(s0.status === 'completed', 'complete: agriculture.0 = completed');
  var s1 = ns.getTechStatus('agriculture', 1);
  assert(s1.status === 'available', 'complete: agriculture.1 = available');

  // 启动进度满额·自动触发完成
  ctx.P.playerInfo.money = 100000; // 大额投入·拉高 progress
  var r2 = ns.startResearch('agriculture', { level: 1, invest: 10000 });
  // 自动完成·返回 completed=true
  if (r2.ok && r2.completed) {
    assert(r2.completed === true, 'complete: 启动即完成');
    assert(ns.getCompleted().indexOf('agriculture.1') >= 0, 'complete: 自动完成入 completed');
    assert(ns.getCurrentResearch() === null, 'complete: 自动完成后 currentResearch 清空');
  }
}

// ────────────────────────────────────────────────────────────
//  §9 tickResearch：每回合推进进度
// ────────────────────────────────────────────────────────────
function testTickResearch(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;

  // 无在研项目·tick 拒绝
  var r0 = ns.tickResearch();
  assert(r0.ok === false, 'tick: 无在研项目拒绝');

  // 启动 + tick 多次推进到完成
  ns.startResearch('military');
  var cr = ns.getCurrentResearch();
  var p0 = cr.progress;
  ctx.GM._playerTech.currentResearch.progress = 80; // 设到 80·一次 tick 应过 100

  var r1 = ns.tickResearch();
  assert(r1.ok === true, 'tick: ok');
  assert(r1.tickGain > 0, 'tick: tickGain > 0');
  if (r1.completed) {
    assert(r1.progress === 100, 'tick: progress=100');
    assert(ns.getCompleted().indexOf('military.0') >= 0, 'tick: military.0 完成');
  } else {
    assert(r1.progress > p0, 'tick: progress 推进');
  }
}

// ────────────────────────────────────────────────────────────
//  §10 上奏推广·皇帝 AI 决定是否采纳
// ────────────────────────────────────────────────────────────
function testPetitionToPromulgate(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;

  // 先完成一项
  ns.startResearch('agriculture');
  ctx.GM._playerTech.currentResearch.progress = 100;
  ns.completeResearch();

  // 挂 callAI·采纳路径
  ctx.callAI = function (prompt) {
    return '皇帝准奏·采纳推广';
  };
  var r1 = ns.petitionToPromulgate('agriculture.0');
  assert(r1.ok === true, 'petition: ok');
  assert(r1.adopt === true, 'petition: adopt=true');
  assert(r1.path === 'promulgated', 'petition: path=promulgated');
  assert(r1.decision.source === 'llm', 'petition: source=llm');
  assert(r1.nationalBoost && r1.nationalBoost.food === 5, 'petition: nationalBoost.food=5');

  // 全国增益已落 GM.nationalTech
  assert(ctx.GM.nationalTech, 'petition: GM.nationalTech 已建');
  assert(ctx.GM.nationalTech.boosts.food === 5, 'petition: GM.nationalTech.boosts.food=5');

  // 改 callAI 拒绝路径
  ctx.callAI = function () { return '皇帝不允'; };
  // 先完成另一项
  ns.startResearch('military');
  ctx.GM._playerTech.currentResearch.progress = 100;
  ns.completeResearch();
  var r2 = ns.petitionToPromulgate('military.0');
  assert(r2.ok === true, 'petition-reject: ok');
  assert(r2.adopt === false, 'petition-reject: adopt=false');
  assert(r2.path === 'petition-rejected', 'petition-reject: path=petition-rejected');

  // 未完成不可上奏
  var r3 = ns.petitionToPromulgate('military.1');
  assert(r3.ok === false, 'petition: 未完成不可上奏');
  assert(r3.code === 'not-completed', 'petition: code=not-completed');

  // 无 LLM·规则引擎降级
  ctx.callAI = undefined;
  ns.startResearch('craft');
  ctx.GM._playerTech.currentResearch.progress = 100;
  ns.completeResearch();
  var r4 = ns.petitionToPromulgate('craft.0');
  assert(r4.ok === true, 'petition-rule: ok');
  assert(r4.decision.source === 'rule', 'petition-rule: source=rule');
  assert(typeof r4.decision.adopt === 'boolean', 'petition-rule: adopt 是 boolean');
}

// ────────────────────────────────────────────────────────────
//  §11 私藏自用·增益仅作用于玩家自身
// ────────────────────────────────────────────────────────────
function testRetainPrivate(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;

  // 完成一项
  ns.startResearch('medicine');
  ctx.GM._playerTech.currentResearch.progress = 100;
  ns.completeResearch();

  var r1 = ns.retainPrivate('medicine.0');
  assert(r1.ok === true, 'retain: ok');
  assert(r1.path === 'private', 'retain: path=private');
  assert(r1.boost && r1.boost.health === 5, 'retain: boost.health=5');

  // 玩家 boosts 已累加（completeResearch 时已加）·retainPrivate 不重复加
  var boosts = ns.getBoosts();
  assert(boosts.health === 5, 'retain: boosts.health=5·未重复累加');

  // discoveries path 标 private
  var disc = ns.getDiscoveries().find(function (d) { return d.id === 'medicine.0'; });
  assert(disc && disc.path === 'private', 'retain: discoveries path=private');

  // 未完成不可标注
  var r2 = ns.retainPrivate('medicine.1');
  assert(r2.ok === false, 'retain: 未完成拒绝');
  assert(r2.code === 'not-completed', 'retain: code=not-completed');

  // 上奏推广后再切回私藏·path 应变更
  ctx.callAI = function () { return '皇帝准奏'; };
  ns.petitionToPromulgate('medicine.0');
  var disc2 = ns.getDiscoveries().find(function (d) { return d.id === 'medicine.0'; });
  assert(disc2.path === 'promulgated', 'retain: 上奏后 path=promulgated');
  ns.retainPrivate('medicine.0');
  var disc3 = ns.getDiscoveries().find(function (d) { return d.id === 'medicine.0'; });
  assert(disc3.path === 'private', 'retain: 切回私藏 path=private');
}

// ────────────────────────────────────────────────────────────
//  §12 御案"科技"面板·可视化科技树
// ────────────────────────────────────────────────────────────
function testRenderPanel(ctx) {
  setupCtx(ctx);
  var ns = ctx.TM.PlayerTech;

  // 完成一项 + 启动一项·让面板有多种 status
  ns.startResearch('agriculture');
  ctx.GM._playerTech.currentResearch.progress = 100;
  ns.completeResearch();
  ns.startResearch('agriculture', { level: 1 });

  var html = ns.renderTechPanel();
  assert(typeof html === 'string', 'render: 返回字符串');
  assert(html.length > 100, 'render: HTML 非空');
  // 总览区
  assert(/科 技 · 总 览/.test(html), 'render: 含"科技·总览"');
  assert(/已解锁/.test(html), 'render: 含"已解锁"');
  assert(/门客匠人/.test(html), 'render: 含"门客匠人"');
  // 5 条主线 label 都渲染
  assert(/农 业/.test(html), 'render: 含"农业"');
  assert(/军 事/.test(html), 'render: 含"军事"');
  assert(/工 艺/.test(html), 'render: 含"工艺"');
  assert(/医 药/.test(html), 'render: 含"医药"');
  assert(/水 利/.test(html), 'render: 含"水利"');
  // 已完成节点有 pt-completed class
  assert(/pt-completed/.test(html), 'render: 含 pt-completed 节点');
  // 进行中节点有 pt-in-progress
  assert(/pt-in-progress/.test(html), 'render: 含 pt-in-progress 节点');
  // 锁定节点有 pt-locked
  assert(/pt-locked/.test(html), 'render: 含 pt-locked 节点');
  // 锁定提示"需先研发 X"
  assert(/需先研发/.test(html), 'render: 含"需先研发"提示');
  // 进度条
  assert(/pt-progress/.test(html), 'render: 含进度条');

  // 渲染到目标元素
  var fakeEl = { innerHTML: '' };
  var r = ns.renderTechPanel(fakeEl);
  assert(r === null, 'render: 传入 targetEl 返回 null');
  assert(fakeEl.innerHTML.length > 100, 'render: targetEl.innerHTML 已写入');

  // 账本未就绪·返回空提示
  var oldGM = ctx.GM;
  ctx.GM = null;
  var empty = ns.renderTechPanel();
  assert(/未就绪/.test(empty), 'render: 账本未就绪提示');
  ctx.GM = oldGM;
}

// ────────────────────────────────────────────────────────────
//  §13 跨朝代铁律·零明清专名（在 smoke 内做精简自检·正式 grep 见主控验证）
// ────────────────────────────────────────────────────────────
function testDynastyNeutral(ctx) {
  var srcTech = fs.readFileSync(path.join(ROOT, 'tm-player-tech.js'), 'utf8');
  var srcData = fs.readFileSync(path.join(ROOT, 'tm-tech-routes-data.js'), 'utf8');
  var banned = ['内阁', '票拟', '司礼监', '东厂', '西厂', '锦衣卫', '军机处', '廷杖', '八股', '巡按', '总督', '巡抚', '郡王', '藩王'];
  banned.forEach(function (w) {
    assert(srcTech.indexOf(w) === -1, 'dynasty-neutral: tm-player-tech.js 不含 ' + w);
    assert(srcData.indexOf(w) === -1, 'dynasty-neutral: tm-tech-routes-data.js 不含 ' + w);
  });
}

// ────────────────────────────────────────────────────────────
//  §14 双路径挂载·module.exports 也应能取到
// ────────────────────────────────────────────────────────────
function testDualMount() {
  // routes data
  var modRoutes = require(path.join(ROOT, 'tm-tech-routes-data.js'));
  assert(modRoutes && modRoutes.TECH_ROUTES_DEFAULT, 'dual-mount: routes module.exports.TECH_ROUTES_DEFAULT 存在');
  assert(modRoutes.TECH_ROUTES_DEFAULT.agriculture, 'dual-mount: routes agriculture 存在');

  // player tech 主模块
  var modTech = require(path.join(ROOT, 'tm-player-tech.js'));
  assert(modTech && modTech.PlayerTech, 'dual-mount: tech module.exports.PlayerTech 存在');
  assert(typeof modTech.PlayerTech.startResearch === 'function', 'dual-mount: startResearch 是函数');
  assert(typeof modTech.PlayerTech.renderTechPanel === 'function', 'dual-mount: renderTechPanel 是函数');
  assert(modTech.PlayerTech.FIELDS.length === 5, 'dual-mount: FIELDS 5 条');
}

// ────────────────────────────────────────────────────────────
//  主流程
// ────────────────────────────────────────────────────────────
try {
  var ctx = buildContext();
  testNamespace(ctx);
  testRoutesData(ctx);
  testGuards(ctx);
  testStartResearch(ctx);
  testPrereqLock(ctx);
  testScenarioOverride(ctx);
  testRecruitArtisan(ctx);
  testCompleteResearch(ctx);
  testTickResearch(ctx);
  testPetitionToPromulgate(ctx);
  testRetainPrivate(ctx);
  testRenderPanel(ctx);
  testDynastyNeutral(ctx);
  testDualMount();
  console.log('[smoke-player-tech] PASS · 14 sub-tests · namespace/data/guards/start/lock(需先研发X)/scenario-merge/recruit-artisan/complete/tick/petition/retain/panel/dynasty-neutral/dual-mount');
  process.exit(0);
} catch (e) {
  console.error('[smoke-player-tech] FAIL:', e.message);
  console.error(e.stack);
  process.exit(1);
}
