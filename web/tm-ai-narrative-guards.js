// @ts-check
/// <reference path="types.d.ts" />
/**
 * tm-ai-narrative-guards.js
 * AI 叙事产出端·两道软校验网(self-consistency + anti-anachronism)
 *
 * 命门服务(自洽 / 时代质感)·两网都「只记不改」(soft)：扫 AI 叙事文本，发现问题
 *   记 console.warn(开发可见)，不硬改数据——避免误伤、留痕可查。这是「防得住多数、
 *   漏的少数有痕可查」的安全网，配合既有的财政/人事硬校验器使用。
 *
 *   _validateLivingActorConsistency(G, aiOutput) —— 自洽：已殁/系狱/流放/在逃者若在本回合
 *                                                   叙事里"行事"(紧跟行动动词)，警示。
 *   _validateNarrativeAnachronism(G, aiOutput)   —— 时代质感：叙事里冒出现代腔/穿越词，警示。
 *
 * 接入：tm-ai-change-applier.js 的 validator 链(各 _validate*Consistency 之后)调用本文件两函数。
 * ★ 跨朝代通用铁律：本文件不含任何朝代专名；现代词黑名单是「古今皆出戏」的词，与具体朝代无关。
 */
(function() {
  'use strict';

  // 从 AI 输出拼出叙事文本(与 _validatePersonnelConsistency 同源字段)
  function _collectNarrative(aiOutput) {
    var nt = '';
    if (!aiOutput) return nt;
    ['shilu_text', 'shizhengji', 'zhengwen', 'yupiHuiting', 'qijuHistory'].forEach(function(k) {
      if (aiOutput[k]) nt += String(aiOutput[k]) + '\n';
    });
    if (Array.isArray(aiOutput.events)) aiOutput.events.forEach(function(e) { if (e && (e.desc || e.text)) nt += String(e.desc || e.text) + '\n'; });
    if (Array.isArray(aiOutput.npc_actions)) aiOutput.npc_actions.forEach(function(na) { if (na && na.desc) nt += String(na.desc) + '\n'; });
    if (Array.isArray(aiOutput.npc_letters)) aiOutput.npc_letters.forEach(function(l) { if (l && l.content) nt += String(l.content) + '\n'; });
    return nt;
  }

  // ── 自洽网：已殁/系狱/流放/在逃者不应在本回合叙事中行事 ──
  var _ACTOR_VERBS = ['上奏', '进言', '上疏', '谏', '请命', '出兵', '领兵', '率军', '亲征', '赴', '谒', '觐见', '献策', '主持', '巡视', '面圣', '奏请'];

  function _validateLivingActorConsistency(G, aiOutput) {
    try {
      if (!G || !aiOutput) return;
      var nt = _collectNarrative(aiOutput);
      if (!nt) return;
      var inactive = (G.chars || []).filter(function(c) {
        return c && c.name && (c.alive === false || c._imprisoned || c._exiled || c._fled || c._missing);
      });
      if (!inactive.length) return;
      var verbsAlt = _ACTOR_VERBS.join('|');
      var flagged = [];
      inactive.forEach(function(c) {
        var nameEsc = String(c.name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // 人名后 0-4 个非汉字间隔内紧跟行动动词 → 疑似让其"行事"
        var pat = new RegExp(nameEsc + '[^\\u4e00-\\u9fff]{0,4}(?:' + verbsAlt + ')');
        if (pat.test(nt)) {
          var st = (c.alive === false) ? 'deceased' : (c._imprisoned ? 'imprisoned' : (c._exiled ? 'exiled' : 'fled/missing'));
          flagged.push(c.name + '(' + st + ')');
        }
      });
      if (flagged.length && typeof console !== 'undefined') {
        console.warn('[NarrativeGuard.LivingActor] inactive characters appear to act this turn (soft warn, no data change):', flagged.join(', '));
      }
    } catch (_e) { /* guard must never break the turn */ }
  }

  // ── 时代质感网：叙事里的现代腔/穿越词(明确古今皆出戏的词，与朝代无关) ──
  var _ANACHRONISMS = ['OK', 'ok', '搞定', '项目', '系统', '概率', '团队', '方案', '流程', '反馈', '优化', '升级', '版本', '用户', '客户', '订单', '绩效', '指标', '平台', '内卷', '点赞', '视频', '网络化', '电脑', '手机', '互联网', '套餐', '档次拉满'];

  function _validateNarrativeAnachronism(G, aiOutput) {
    try {
      if (!aiOutput) return;
      var nt = _collectNarrative(aiOutput);
      if (!nt) return;
      var hits = [];
      _ANACHRONISMS.forEach(function(w) {
        if (nt.indexOf(w) >= 0 && hits.indexOf(w) < 0) hits.push(w);
      });
      if (hits.length && typeof console !== 'undefined') {
        console.warn('[NarrativeGuard.Anachronism] modern / out-of-period words in AI narrative (soft warn):', hits.join(' '));
      }
    } catch (_e) { /* guard must never break the turn */ }
  }

  if (typeof window !== 'undefined') {
    window._validateLivingActorConsistency = _validateLivingActorConsistency;
    window._validateNarrativeAnachronism = _validateNarrativeAnachronism;
  }
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      _validateLivingActorConsistency: _validateLivingActorConsistency,
      _validateNarrativeAnachronism: _validateNarrativeAnachronism,
      _collectNarrative: _collectNarrative,
      _ACTOR_VERBS: _ACTOR_VERBS,
      _ANACHRONISMS: _ANACHRONISMS
    };
  }
})();
