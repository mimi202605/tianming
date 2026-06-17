/**
 * tm-keju-yanguan-qingyi.js
 * v7.1·Slice F4c·言官集体清议·走常朝 source pool
 *
 * 触发·某党 (X) 1 turn 内被弹劾/罢免·该党言官门生 (alive ≥3) 集体清议
 * cooldown·同一党 5 年内不重 spawn
 * 输出·写入 GM._kjYanguanQingyi 队列·_cc2_collectAgendaSources 消费·
 *      LLM 改写为"都察院 X 等 N 人·清议某党"
 *
 * red line·
 *   - flag gate·P.conf.useNewKejuD1=false 全 no-op
 *   - 不发 modal·不发邸报·不动 keyi 800 行
 *   - 走 _cc2_pushAgendaSource·让 LLM 改写为言官 NPC 上奏
 *
 * 集成点·1.2.5.2·_ty3_phase12_onAccusationApproved 准奏弹劾尾部直 call _kjSpawnYanguanQingyi(sourceParty, leader, detail)
 * endTurn _kjCheckYanguanQingyiTriggers 保留为防御 backup·扫 GM._chronicle 当 turn 的 impeachment-party 漏 spawn
 *
 * Public API·
 *   _kjCheckYanguanQingyiTriggers()             — endTurn 防御扫·补漏 spawn
 *   _kjConsumeYanguanQingyiForAgenda()          — _cc2_collectAgendaSources 调·消费队列
 *   _kjSpawnYanguanQingyi(party, member, evt)   — 直 call·准奏弹劾时由 tinyi-v3 主调
 *
 * 依赖·
 *   - F4a _kjYanguanResolveAttribution (resolve mentorParty)
 *   - tm-chaoyi.js _cc2_pushAgendaSource (在 _cc2_collectAgendaSources 内引)
 */
(function() {
  'use strict';

  var COOLDOWN_YEARS = 5;
  var MIN_YANGUAN = 3;
  var MAX_SPAWN_PER_TURN = 1;
  var MAX_CONSUME_PER_AGENDA = 2;

  function _isD1Enabled() {
    if (typeof P === 'undefined' || !P || !P.conf) return false;
    return P.conf.useNewKejuD1 !== false; // 默认开·2026-06-15·门生/清议解锁（spawn 有冷却·不刷屏；undefined→on·显式 false 才关）
  }

  /** 主入口·endTurn 调·防御扫 GM._chronicle 当 turn 的 impeachment-party 事件补漏 spawn
   *  主路径走 _kjSpawnYanguanQingyi 直 call (tm-tinyi-v3.js _ty3_phase12_onAccusationApproved 尾部)
   *  此处作为防御 backup·防 race/迁移导致主路径漏调时不丢清议
   *  返 spawn 的清议数 */
  function _kjCheckYanguanQingyiTriggers() {
    if (!_isD1Enabled()) return 0;
    if (typeof GM === 'undefined' || !GM) return 0;
    if (!GM._kjYanguanQingyi) GM._kjYanguanQingyi = [];
    if (!GM._kjYanguanQingyiCooldown) GM._kjYanguanQingyiCooldown = {};
    var chronicle = Array.isArray(GM._chronicle) ? GM._chronicle : [];
    if (!chronicle.length) return 0;
    var curTurn = (GM.turn || 0);
    var spawned = 0;
    // 扫当 turn 的 impeachment-party 事件·sourceParty 走「被劾新党」的 parentParty
    // 注·_ty3_partySpawn 后的 chronicle entry partyName=newName (子党)·sourceParty 需查 parties.splinterFrom
    for (var i = chronicle.length - 1; i >= 0 && i >= chronicle.length - 30; i--) {
      var e = chronicle[i];
      if (!e || e.turn !== curTurn) continue;
      if (e.type !== 'impeachment-party') continue;
      if (e._kjQingyiHandled) continue;
      // 查 splinterFrom (源党)·从 newName party 反查
      var sourceParty = '';
      try {
        var newP = (GM.parties || []).find(function(p) { return p && p.name === e.partyName; });
        if (newP && newP.splinterFrom) sourceParty = newP.splinterFrom;
      } catch (_) {}
      if (!sourceParty) continue;
      var leader = Array.isArray(e.accused) && e.accused.length ? e.accused[0] : '';
      var detail = (e.text || '').slice(0, 60);
      if (spawned >= MAX_SPAWN_PER_TURN) break;
      if (_kjSpawnYanguanQingyi(sourceParty, leader, detail)) {
        e._kjQingyiHandled = true;
        spawned++;
      } else {
        // cooldown 内·标记 handled 不再扫
        e._kjQingyiHandled = true;
      }
    }
    return spawned;
  }

  /** 供 _cc2_collectAgendaSources 调·消费当前 spawned qingyi (最多 2·防 spam) */
  function _kjConsumeYanguanQingyiForAgenda() {
    if (!_isD1Enabled()) return [];
    if (typeof GM === 'undefined' || !GM) return [];
    if (!GM._kjYanguanQingyi || !GM._kjYanguanQingyi.length) return [];
    var out = GM._kjYanguanQingyi.slice(0, MAX_CONSUME_PER_AGENDA);
    GM._kjYanguanQingyi = GM._kjYanguanQingyi.slice(MAX_CONSUME_PER_AGENDA);
    return out;
  }

  /** 手动 spawn·供 incident system 集成时调
   *  @param party        被攻击党
   *  @param attackedMember 被弹劾/罢免人
   *  @param eventDetail  事件细节文字
   *  @return true (已 spawn) / false (cooldown 内 或 言官不足) */
  function _kjSpawnYanguanQingyi(party, attackedMember, eventDetail) {
    if (!_isD1Enabled()) return false;
    if (typeof GM === 'undefined' || !GM) return false;
    if (!GM._kjYanguanQingyi) GM._kjYanguanQingyi = [];
    if (!GM._kjYanguanQingyiCooldown) GM._kjYanguanQingyiCooldown = {};
    var year = (GM.year || 0);
    var lastSpawn = GM._kjYanguanQingyiCooldown[party] || 0;
    if (lastSpawn && (year - lastSpawn) < COOLDOWN_YEARS) return false;
    // 找该党言官门生 (alive ≥3)
    var yanguanList = (GM.chars || []).filter(function(ch) {
      if (!ch || ch.alive === false) return false;
      var t = ch.officialTitle || ch.title || '';
      if (!/御史|给事中|监察/.test(t)) return false;
      if (typeof _kjYanguanResolveAttribution !== 'function') return false;
      var attr = _kjYanguanResolveAttribution(ch);
      return attr && attr.mentorParty === party;
    });
    if (yanguanList.length < MIN_YANGUAN) return false;
    GM._kjYanguanQingyi.push({
      party: party,
      attackedMember: attackedMember || '',
      yanguanLeader: yanguanList[0].name,
      yanguanCount: yanguanList.length,
      eventDetail: eventDetail || '',
      spawnedTurn: (GM.turn || 0),
      spawnedYear: year
    });
    GM._kjYanguanQingyiCooldown[party] = year;
    return true;
  }

  // 暴露
  if (typeof window !== 'undefined') {
    window._kjCheckYanguanQingyiTriggers = _kjCheckYanguanQingyiTriggers;
    window._kjConsumeYanguanQingyiForAgenda = _kjConsumeYanguanQingyiForAgenda;
    window._kjSpawnYanguanQingyi = _kjSpawnYanguanQingyi;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _kjCheckYanguanQingyiTriggers: _kjCheckYanguanQingyiTriggers,
      _kjConsumeYanguanQingyiForAgenda: _kjConsumeYanguanQingyiForAgenda,
      _kjSpawnYanguanQingyi: _kjSpawnYanguanQingyi
    };
  }
})();
