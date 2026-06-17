// @ts-check
/// <reference path="types.d.ts" />
/**
 * tm-keju-reform-memorial.js — Phase L·L7·改革反弹奏疏·走常朝 source pool
 *
 * paradigm·跟 F2 disciple-memorial (tm-keju-disciple-memorial.js) 同 paradigm·镜像
 *
 * 触发·改革 status=ramping/active + (method=edict|defy OR magnitude>=60) + 反对派 alive
 * cooldown·同 reformId·5 turn 内不重 spawn
 *
 * 输出·写入 GM._kjReformMemorials 队列·_cc2_collectAgendaSources 消费·
 *      若 cosigners≥5 且跨党·也 push GM._pendingTinyiTopics (廷议待议)
 *
 * red line·
 *   - flag gate·P.conf.useNewKejuL7=false 全 no-op
 *   - 不发 modal·不发邸报·不动 keyi 800 行·不直 spawn 言官
 *   - 走 _cc2_pushAgendaSource(out, seen, row)·让 LLM 改写为反对派 NPC 上奏
 *
 * Public API·
 *   _kjSpawnReformMemorial(hist, ctx)            — L7 apply 后调·入 queue·cooldown 内
 *   _kjCheckReformMemorialTriggers()             — endTurn 调·兜底 scan history
 *   _kjConsumeReformMemorialsForAgenda()         — _cc2_collectAgendaSources 调·消费 (MAX 2)
 *   _kjIsCrossPartyReformMemorial(memorial)      — 跨党检测
 *
 * 依赖·
 *   - GM._kejuParadigm.history (L1·entry.status state machine)
 *   - hist.opposeNpcs (L7·d 派生·breakdown stance)
 *   - tm-chaoyi.js _cc2_pushAgendaSource (在 _cc2_collectAgendaSources 内引)
 *   - findCharByName (global·index world)
 */
(function() {
  'use strict';

  var COOLDOWN_TURNS = 5;
  var COOLDOWN_TURNS_ACTIVE = 15;   // RAA·B5·active state 延长·因 active 期长 (ramp 完 → matured)·防年年生奏
  var MIN_COSIGNERS = 2;
  var ESCALATE_TINYI_COSIGNERS = 5;
  var MAX_SPAWN_PER_TURN = 1;
  var MAX_CONSUME_PER_AGENDA = 2;
  var NEUTRAL_PARTIES = ['中立', '无党', '无党派'];

  function _isL7Enabled() {
    if (typeof P === 'undefined' || !P || !P.conf) return false;
    return P.conf.useNewKejuL7 !== false;
  }

  /**
   * L7 apply 后直调·入 queue·cooldown 在内·返 memorial 或 null
   */
  function _kjSpawnReformMemorial(hist, ctx) {
    if (!_isL7Enabled()) return null;
    if (!hist || !hist.id) return null;
    if (typeof GM === 'undefined' || !GM) return null;
    if (!GM._kjReformMemorials) GM._kjReformMemorials = [];
    if (!GM._kjReformMemorialCooldown) GM._kjReformMemorialCooldown = {};

    // cooldown per-reformId·RAA·B5·按 hist.status 调·active 状态延长 (改革施行中·反对派不应年年生奏)
    // L9·C1·若 ctx.bypassCooldown=true (e.g. 黑天鹅 immediate spawn)·skip cooldown 守
    var lastSpawn = GM._kjReformMemorialCooldown[hist.id] || 0;
    var turn = (GM.turn || 0);
    var cd = (hist.status === 'active') ? COOLDOWN_TURNS_ACTIVE : COOLDOWN_TURNS;
    if (!(ctx && ctx.bypassCooldown) && lastSpawn && (turn - lastSpawn) < cd) return null;

    // L11·RBB·E4·rollback + target 同 turn 双 memorial flood cap·全局 reform memorial 1/turn
    // (L9 黑天鹅 bypassCooldown 不受此限·因 swan 一 turn 1 cap 已在 _l9TinyiSpawnTurn)
    if (!(ctx && ctx.bypassCooldown)) {
      if (GM._kjReformMemorialLastSpawnTurn === turn) {
        return null;
      }
      GM._kjReformMemorialLastSpawnTurn = turn;
    }

    // 反对派 alive filter·非 hardcode·从 hist.opposeNpcs 派生
    var aliveOpposers = (hist.opposeNpcs || []).filter(function(name) {
      var ch = (typeof findCharByName === 'function') ? findCharByName(name) : null;
      if (!ch) return false;
      if (ch.alive === false) return false;
      if (ch._retired || ch._exiled || ch._imprisoned) return false;
      if (ch._mourning || ch._fled || ch._missing) return false;
      return true;
    });
    if (aliveOpposers.length < MIN_COSIGNERS) return null;

    var leader = aliveOpposers[0];
    var cosigners = aliveOpposers.slice(0, 10);

    // L9·B2·若 ctx 含 forcedTopic / forcedIdeology / source·入 memorial·LLM 拼奏疏 prompt 可读
    var memorial = {
      reformId: hist.id,
      reformMagnitudeDescriptor: hist.magnitudeDescriptor || '',
      method: hist.method,
      intent: hist.intent,
      triggerType: (ctx && ctx.source === 'L9-blackswan') ? 'blackswan_reform'
                 : hist.method === 'defy' ? 'defy_reform'
                 : hist.method === 'edict' ? 'edict_reform'
                 : 'radical_reform',
      leaderOpposer: leader,
      cosigners: cosigners,
      spawnedTurn: turn,
      detail: _kjL7BuildMemorialDetail(hist, ctx),
      l9Source: (ctx && ctx.source) || null,
      l9ForcedTopic: (ctx && ctx.forcedTopic) || null,
      l9ForcedIdeology: (ctx && ctx.forcedIdeology) || null
    };
    GM._kjReformMemorials.push(memorial);
    // L9·RAA·C1·若 bypassCooldown=true (L9 黑天鹅)·不写 cooldown record·避免 L9 spawn 反咬 L7 反弹 cooldown
    if (!(ctx && ctx.bypassCooldown)) {
      GM._kjReformMemorialCooldown[hist.id] = turn;
    }

    // escalate·跨党 + cosigners≥5 → 廷议待议 (跟 F2 同 paradigm)
    // L9·RBB·BB-A3·L9-blackswan 触发的 escalate·一 turn 最多 1 个·防 tinyi flood
    var shouldEscalate = cosigners.length >= ESCALATE_TINYI_COSIGNERS && _kjIsCrossPartyReformMemorial(memorial);
    var isL9Trigger = ctx && ctx.source === 'L9-blackswan';
    if (isL9Trigger && shouldEscalate) {
      if (GM._l9TinyiSpawnTurn === turn) {
        shouldEscalate = false;   // 同 turn L9 已 escalate 过·skip
      } else {
        GM._l9TinyiSpawnTurn = turn;
      }
    }
    if (shouldEscalate) {
      if (!Array.isArray(GM._pendingTinyiTopics)) GM._pendingTinyiTopics = [];
      GM._pendingTinyiTopics.push({
        title: '反改革议·' + (hist.magnitudeDescriptor || '改革') + '·' + leader + '等联名',
        topic: memorial.detail,
        from: leader + '等反改革官联名 (' + cosigners.length + '人)',
        dept: '言官·廷议',
        importance: 8
      });
    }

    return memorial;
  }

  /**
   * 构 memorial detail·短文·LLM hint·非完整奏疏 (LLM 自己 spawn 完整文)
   * 注意·_cc2_cleanAgendaText slice(0, 120)·控长度
   */
  function _kjL7BuildMemorialDetail(hist, ctx) {
    // L9·B2·若 ctx.forcedTopic·hint LLM 该奏疏 focus 该 topic·非默 改革反对
    if (ctx && ctx.forcedTopic) {
      var d = (ctx.source === 'L9-blackswan' ? '黑天鹅事·' : '') +
              (ctx.forcedTopic || '') + '·' +
              (hist.magnitudeDescriptor || '改革') + '·伏请陛下察';
      return d.length > 110 ? d.slice(0, 110) : d;
    }
    var prefix = hist.method === 'defy'  ? '逆众议'
               : hist.method === 'edict' ? '不依议'
               : '议过';
    // L11·D4·intent='rollback' suffix·拥护废止 / 反对废止 立场反转
    var suffix = hist.intent === 'rollback'    ? '罢前改·若新进·拥护·若旧党·反复无常'
               : hist.intent === 'restoration' ? '复古·恐祖制重违'
                                                : '改科举·恐古制坏';
    var detail = prefix + '·' + (hist.magnitudeDescriptor || '改革') + '·' + suffix + '·伏请陛下察';
    return detail.length > 110 ? detail.slice(0, 110) : detail;
  }

  /**
   * 跨党检测·mentor 党 vs 中立/无党 → false·否则 true
   */
  function _kjIsCrossPartyReformMemorial(memorial) {
    if (!memorial || !memorial.leaderOpposer) return false;
    if (typeof findCharByName !== 'function') return false;
    var ch = findCharByName(memorial.leaderOpposer);
    if (!ch || !ch.party) return false;
    return NEUTRAL_PARTIES.indexOf(ch.party) < 0;
  }

  /**
   * endTurn·兜底·扫 history·补 spawn missed
   * 防 L7 apply 时 cooldown miss / NPC 后续 alive 变 / 多 ramping 改革重 trigger
   */
  function _kjCheckReformMemorialTriggers() {
    if (!_isL7Enabled()) return 0;
    if (typeof GM === 'undefined' || !GM || !GM._kejuParadigm) return 0;
    var hist = GM._kejuParadigm.history || [];
    var spawned = 0;
    for (var i = hist.length - 1; i >= 0; i--) {
      if (spawned >= MAX_SPAWN_PER_TURN) break;
      var h = hist[i];
      if (!h) continue;
      if (h.status !== 'ramping' && h.status !== 'active') continue;
      // 触发门槛
      var radical = (h.magnitudeParsed && h.magnitudeParsed.radical) || 0;
      if (h.method !== 'edict' && h.method !== 'defy' && radical < 60) continue;
      var memorial = _kjSpawnReformMemorial(h, {
        topicData: { topic: h.reason || '改革' }
      });
      if (memorial) spawned++;
    }
    return spawned;
  }

  /**
   * 供 _cc2_collectAgendaSources 调·消费当前 spawned memorials (MAX 2·防 spam)
   */
  function _kjConsumeReformMemorialsForAgenda() {
    if (!_isL7Enabled()) return [];
    if (typeof GM === 'undefined' || !GM) return [];
    if (!GM._kjReformMemorials || !GM._kjReformMemorials.length) return [];
    var out = GM._kjReformMemorials.slice(0, MAX_CONSUME_PER_AGENDA);
    GM._kjReformMemorials = GM._kjReformMemorials.slice(MAX_CONSUME_PER_AGENDA);
    return out;
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kjSpawnReformMemorial            = _kjSpawnReformMemorial;
    window._kjCheckReformMemorialTriggers    = _kjCheckReformMemorialTriggers;
    window._kjConsumeReformMemorialsForAgenda= _kjConsumeReformMemorialsForAgenda;
    window._kjIsCrossPartyReformMemorial     = _kjIsCrossPartyReformMemorial;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjSpawnReformMemorial: _kjSpawnReformMemorial,
      _kjCheckReformMemorialTriggers: _kjCheckReformMemorialTriggers,
      _kjConsumeReformMemorialsForAgenda: _kjConsumeReformMemorialsForAgenda,
      _kjIsCrossPartyReformMemorial: _kjIsCrossPartyReformMemorial
    };
  }
})();
