// ============================================================
// tm-player-interaction.js — 穿越模式 Phase 4.5 · Task 15 玩家人物互动系统
// ------------------------------------------------------------
// 跨朝代铁律：本文件绝不出现任何明清专属机构/职务/科场专名（内阁/票拟/
//   司礼监/东厂/西厂/锦衣卫/军机处/廷杖/八股等一律由剧本 hook）。
//   引擎层只提供「玩家 ↔ NPC 一对一互动」的通用框架，朝代中立。
// ------------------------------------------------------------
// 暴露：window.TM.PlayerInteraction.{
//   interact, listInteractableNpcs, getActionMenu, getRelationDims, KINDS, DIMS
// }
// 依赖（运行时软依赖，缺席时降级）：
//   - _spendEnergy / GM._energy / GM.turn            （精力·时间）
//   - applyNpcInteraction / ensureCharRelation       （tm-relations.js）
//   - NpcMemorySystem.remember                       （tm-mechanics-memory.js）
//   - findCharByName / canonicalizeCharName          （tm-utils.js / tm-indices.js）
//   - TM.Transmigration.isTransmigrationMode         （tm-transmigration.js）
//   - global.callAI / callLLM                       （运行时 LLM 适配）
// 双路径挂载：浏览器走 window.TM.PlayerInteraction；node smoke 走 module.exports。
// ============================================================

(function (global) {
  'use strict';

  // ── 互动类型 KINDS ──────────────────────────────────────────
  //   energy:  精力消耗（沿用 _spendEnergy）
  //   time:    时长（小时·累积进 P.playerInfo._timeUsedThisTurn·满 12 推进 1 回合）
  //   npcType: 复用 tm-relations.js 的 NPC_INTERACTION_TYPES 键（缺席时降级直写 relations）
  //   dim:     主影响的 5 维之一（master/friend/rival/colleague/enemy）
  //   importance: 写入记忆的重要度（1-10）
  var KINDS = {
    visit:      { label: '拜访',   energy: 1, time: 2, npcType: 'private_visit',     dim: 'friend',    importance: 4, mood: '喜' },
    secretTalk: { label: '密谈',   energy: 2, time: 3, npcType: 'correspond_secret', dim: 'friend',    importance: 6, mood: '平' },
    entrust:    { label: '请托',   energy: 2, time: 2, npcType: 'recommend',         dim: 'friend',    importance: 6, mood: '喜' },
    befriend:   { label: '结交',   energy: 2, time: 3, npcType: 'invite_banquet',    dim: 'friend',    importance: 5, mood: '喜' },
    gift:       { label: '馈赠',   energy: 1, time: 1, npcType: 'gift_present',      dim: 'friend',    importance: 3, mood: '喜' },
    marry:      { label: '联姻',   energy: 3, time: 6, npcType: 'marriage_alliance', dim: 'friend',    importance: 9, mood: '喜' },
    antagonize: { label: '寻仇',   energy: 2, time: 2, npcType: 'confront',          dim: 'rival',     importance: 6, mood: '恨' },
    frame:      { label: '陷害',   energy: 3, time: 4, npcType: 'frame_up',          dim: 'enemy',     importance: 10, mood: '恨' },
    recruit:    { label: '笼络',   energy: 2, time: 3, npcType: 'form_cllique',      dim: 'colleague', importance: 5, mood: '平' },
    disciple:   { label: '收徒',   energy: 3, time: 5, npcType: 'master_disciple',   dim: 'master',    importance: 9, mood: '喜' }
  };
  // ↑ recruit 复用 form_clique（笼络 ≈ 结党），键名轻微差异由 _applyRelation 兜底

  // ── 5 维关系（师徒/亲友/政敌/同僚/仇敌）──────────────────────
  //   每维 0-100·玩家 ← NPC 视角·存于 ch._playerRelDims[npcName]
  //   并向 NPC→玩家 relations 同步 affinity/trust/hostility 等基础量
  var DIMS = {
    master:    { label: '师徒', relationLabels: ['master', 'disciple'] },
    friend:    { label: '亲友', relationLabels: ['close_friend', 'poet_friend', 'old_acquaintance', 'in_law', 'clan'] },
    rival:     { label: '政敌', relationLabels: ['political_rival'] },
    colleague: { label: '同僚', relationLabels: ['colleague', 'same_party', 'same_cohort'] },
    enemy:     { label: '仇敌', relationLabels: ['sworn_enemy'] }
  };

  var _TIME_PER_TURN = 12; // 累积 12 小时 → GM.turn +1

  // ── 软依赖·缺席降级 ─────────────────────────────────────────
  function _isTransmigration() {
    try {
      if (global.TM && global.TM.Transmigration && typeof global.TM.Transmigration.isTransmigrationMode === 'function') {
        return !!global.TM.Transmigration.isTransmigrationMode();
      }
    } catch (_) {}
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) return P.playerInfo.transmigrationMode === true;
    } catch (_) {}
    return false;
  }

  function _findChar(name) {
    if (!name) return null;
    try { if (typeof findCharByName === 'function') return findCharByName(name); } catch (_) {}
    try {
      if (typeof GM !== 'undefined' && GM && Array.isArray(GM.chars)) {
        for (var i = 0; i < GM.chars.length; i++) {
          var c = GM.chars[i];
          if (c && c.name === name) return c;
        }
      }
    } catch (_) {}
    return null;
  }

  function _canonName(name) {
    if (!name) return name;
    try { if (typeof canonicalizeCharName === 'function') return canonicalizeCharName(name) || name; } catch (_) {}
    return name;
  }

  function _ensureArr(obj, key) {
    if (!obj) return null;
    if (!Array.isArray(obj[key])) obj[key] = []; // arch-ok (玩家/NPC 私账·非 GM/P 单例直写)
    return obj[key];
  }

  // ── 精力消耗 ────────────────────────────────────────────────
  //   主路径：复用全局 _spendEnergy（tm-launch.js 定义·通过 global 取·避免本函数自递归）
  //   降级路径：自管 GM._energy（与 tm-launch.js 同款直写·arch-ok）
  function _spendEnergyLocal(cost, label) {
    try {
      if (global && typeof global._spendEnergy === 'function') {
        return global._spendEnergy(cost, label);
      }
    } catch (_) {}
    try {
      if (typeof GM === 'undefined' || !GM) return true;
      if (GM._energy === undefined) return true; // 未初始化则不限
      if (GM._energy < cost) return false;
      GM._energy -= cost; // arch-ok (精力账本·与 tm-launch.js 同款直写)
      return true;
    } catch (_) {}
    return true;
  }

  // ── 时间推进 ────────────────────────────────────────────────
  function _advanceTime(hours) {
    if (!hours || hours <= 0) return { turnAdvanced: false };
    try {
      if (typeof P === 'undefined' || !P || !P.playerInfo) return { turnAdvanced: false };
      var pi = P.playerInfo;
      if (typeof pi._timeUsedThisTurn !== 'number') pi._timeUsedThisTurn = 0; // arch-ok
      pi._timeUsedThisTurn += hours; // arch-ok
      if (pi._timeUsedThisTurn >= _TIME_PER_TURN) {
        pi._timeUsedThisTurn -= _TIME_PER_TURN; // arch-ok
        try {
          if (typeof GM !== 'undefined' && GM && typeof GM.turn === 'number') {
            GM.turn += 1; // arch-ok (时间流逝·与 endturn 同款·单次 +1)
            return { turnAdvanced: true, turn: GM.turn };
          }
        } catch (_) {}
        return { turnAdvanced: true };
      }
      return { turnAdvanced: false };
    } catch (_) {}
    return { turnAdvanced: false };
  }

  // ── LLM 调用（运行时真实·缺席/mock 降级）────────────────────
  function _callLLM(prompt) {
    // 1) global.callAI（与 tm-sovereign-ai.js 一致的主路径）
    try {
      if (typeof global.callAI === 'function') return global.callAI(prompt);
    } catch (_) {}
    // 2) 全局 callLLM
    try {
      if (typeof callLLM === 'function') return callLLM(prompt);
    } catch (_) {}
    // 3) 同步降级·返回 null（由 _generateScene 兜底）
    return null;
  }

  function _generateScene(player, npc, kind, payload) {
    var def = KINDS[kind];
    var pName = (player && player.name) || '玩家';
    var nName = (npc && npc.name) || '对方';
    var pPers = (player && (player.personality || '')) || '';
    var nPers = (npc && (npc.personality || '')) || '';
    var pTitle = (player && (player.officialTitle || player.title || player.role || '')) || '';
    var nTitle = (npc && (npc.officialTitle || npc.title || npc.role || '')) || '';

    var prompt = [
      '【玩家人物互动·场景生成】',
      '玩家：' + pName + (pTitle ? '（' + pTitle + '）' : '') + (pPers ? '·性格:' + pPers : ''),
      '对方：' + nName + (nTitle ? '（' + nTitle + '）' : '') + (nPers ? '·性格:' + nPers : ''),
      '互动：' + def.label + '（' + kind + '）',
      payload.topic ? '主题：' + payload.topic : '',
      payload.intent ? '意图：' + payload.intent : '',
      '请基于双方性格、关系、当前局势，生成一段 60-120 字的互动场景描述（朝代中立）。'
    ].filter(Boolean).join('\n');

    var llm = _callLLM(prompt);
    if (llm && typeof llm === 'string' && llm.trim()) return llm.trim();

    // 降级·确定性 mock（不依赖 LLM）
    var bits = [
      pName + '与' + nName + '行「' + def.label + '」之事',
      payload.topic ? '言及「' + payload.topic + '」' : '相与语',
      def.mood === '喜' ? '席间意气相投' : (def.mood === '恨' ? '言语交锋·气氛紧张' : '议事而散')
    ];
    return bits.join('，') + '。';
  }

  // ── 5 维关系值更新 ──────────────────────────────────────────
  //   主路径：调 applyNpcInteraction（tm-relations.js）·同步 5 维本地副本
  //   降级路径：applyNpcInteraction 缺席时·直接 ensureCharRelation + 本地 5 维
  //   语义：每维 0-100 表示「该类关系的强度」·所有互动都让其主维度强度上升
  //         （frame 升 enemy·antagonize 升 rival·disciple 升 master·recruit 升 colleague·其余升 friend）
  function _dimDelta(kind) {
    var def = KINDS[kind];
    var mag = Math.max(3, Math.min(20, def.importance * 2));
    var d = {};
    d[def.dim] = mag;
    return d;
  }

  function _ensureDims(charObj, otherName) {
    if (!charObj) return null;
    if (typeof charObj._playerRelDims !== 'object' || charObj._playerRelDims === null) {
      charObj._playerRelDims = {}; // arch-ok (角色私账·非 GM/P 单例)
    }
    if (!charObj._playerRelDims[otherName]) {
      var init = {};
      Object.keys(DIMS).forEach(function (k) { init[k] = 50; });
      charObj._playerRelDims[otherName] = init; // arch-ok
    }
    return charObj._playerRelDims[otherName];
  }

  function _clampDim(v) { return Math.max(0, Math.min(100, v)); }

  function _applyRelation(playerName, npcName, kind, payload) {
    var def = KINDS[kind];
    var delta = _dimDelta(kind);
    var pCanon = _canonName(playerName);
    var nCanon = _canonName(npcName);

    // 主路径·复用 tm-relations.js
    var appliedViaNpc = false;
    try {
      if (typeof applyNpcInteraction === 'function' && def.npcType) {
        // applyNpcInteraction 的 type 键必须存在于 NPC_INTERACTION_TYPES·recruit 用 form_clique 兜底
        var typeKey = def.npcType;
        if (typeof NPC_INTERACTION_TYPES !== 'undefined' && !NPC_INTERACTION_TYPES[typeKey]) {
          if (typeKey === 'form_cllique') typeKey = 'form_clique';
        }
        if (typeof NPC_INTERACTION_TYPES === 'undefined' || NPC_INTERACTION_TYPES[typeKey]) {
          appliedViaNpc = applyNpcInteraction(pCanon, nCanon, typeKey, { description: def.label + (payload.topic ? '·' + payload.topic : '') });
        }
      }
    } catch (_) {}

    // 降级路径·直写 ensureCharRelation
    if (!appliedViaNpc) {
      try {
        if (typeof ensureCharRelation === 'function') {
          var r = ensureCharRelation(pCanon, nCanon);
          if (r) {
            var sign = (def.dim === 'rival' || def.dim === 'enemy') ? -1 : 1;
            r.affinity = _clampDim((r.affinity || 50) + sign * 10);
            r.trust = _clampDim((r.trust || 50) + sign * 6);
            if (def.dim === 'enemy') r.hostility = _clampDim((r.hostility || 0) + 20);
            if (def.dim === 'rival') r.hostility = _clampDim((r.hostility || 0) + 8);
            if (!r.labels) r.labels = [];
            DIMS[def.dim].relationLabels.forEach(function (l) {
              if (r.labels.indexOf(l) < 0) r.labels.push(l);
            });
          }
        }
      } catch (_) {}
    }

    // 5 维本地副本（玩家视角 + NPC 视角对称）
    var playerCh = _findChar(pCanon);
    var npcCh = _findChar(nCanon);
    var pd = _ensureDims(playerCh, nCanon);
    var nd = _ensureDims(npcCh, pCanon);
    Object.keys(delta).forEach(function (k) {
      if (pd) pd[k] = _clampDim((pd[k] || 50) + delta[k]);
      if (nd) nd[k] = _clampDim((nd[k] || 50) + delta[k]);
    });

    return { delta: delta, appliedViaNpc: appliedViaNpc, dims: pd ? Object.assign({}, pd) : null };
  }

  // ── 记忆写入（沿用 NpcMemorySystem.remember + 玩家私账副本）──
  function _writeMemory(playerName, npcName, kind, sceneDesc, def) {
    var entry = {
      turn: (typeof GM !== 'undefined' && GM && GM.turn) || 0,
      kind: kind,
      label: def.label,
      npc: npcName,
      scene: sceneDesc,
      importance: def.importance,
      mood: def.mood,
      ts: (typeof Date !== 'undefined' && Date.now) ? Date.now() : 0
    };

    // 1) NPC 记忆（沿用 NpcMemorySystem.remember）
    try {
      if (typeof NpcMemorySystem !== 'undefined' && NpcMemorySystem && typeof NpcMemorySystem.remember === 'function') {
        NpcMemorySystem.remember(
          npcName,
          (playerName || '玩家') + '与己' + def.label + (sceneDesc ? '——' + String(sceneDesc).slice(0, 60) : ''),
          def.mood, def.importance, playerName, { type: 'player_interaction', kind: kind }
        );
      }
    } catch (_) {}

    // 2) 玩家记忆·私账副本（P.playerInfo._playerMemory）
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo) {
        if (!Array.isArray(P.playerInfo._playerMemory)) P.playerInfo._playerMemory = []; // arch-ok
        P.playerInfo._playerMemory.push(entry); // arch-ok
        if (P.playerInfo._playerMemory.length > 200) {
          P.playerInfo._playerMemory = P.playerInfo._playerMemory.slice(-200); // arch-ok
        }
      }
    } catch (_) {}

    return entry;
  }

  // ── 联姻·双方家族建立姻亲关系 ──────────────────────────────
  function _applyMarriage(player, npc, payload) {
    if (!player || !npc) return null;
    var pName = player.name;
    var nName = npc.name;
    var dowry = payload.dowry || 0;

    // 1) family 字段·扩展为家族联盟清单（不破坏原 family 名字符串）
    if (!Array.isArray(player.familyAlliances)) player.familyAlliances = []; // arch-ok
    if (!Array.isArray(npc.familyAlliances)) npc.familyAlliances = []; // arch-ok
    if (player.familyAlliances.indexOf(nName) < 0) player.familyAlliances.push(nName);
    if (npc.familyAlliances.indexOf(pName) < 0) npc.familyAlliances.push(pName);

    // 2) 双方 family 字段·若为空则互写对方家族名（剧本可挂 playerInfo.familyName）
    try {
      if (typeof P !== 'undefined' && P && P.playerInfo && P.playerInfo.familyName && !player.family) {
        player.family = P.playerInfo.familyName; // arch-ok
      }
    } catch (_) {}
    if (!npc.family && player.family) npc.family = player.family; // arch-ok (姻亲从夫/妻家族名·剧本可后续覆盖)
    if (!player.family && npc.family) player.family = npc.family; // arch-ok

    // 3) 姻亲标记·relations 标签由 applyNpcInteraction(marriage_alliance) 已加·此处补 _ensureDims friend 维
    var pd = _ensureDims(player, nName);
    var nd = _ensureDims(npc, pName);
    if (pd) pd.friend = _clampDim((pd.friend || 50) + 15);
    if (nd) nd.friend = _clampDim((nd.friend || 50) + 15);

    return { player: pName, npc: nName, dowry: dowry, familyAlliances: [pName, nName] };
  }

  // ── 事件钩子·密谋政变提示 ───────────────────────────────────
  //   触发：NPC 为军中将领（禁军/禁卫/将军/都督/总兵/校尉/军侯等通称）
  //        + 玩家与之关系达「死党」（friend ≥ 80 且 trust ≥ 70）
  //        + kind === 'secretTalk'
  //   返回 hint：可发动政变（关联反叛系统·剧本 hook 具体路径）
  var _MILITARY_RE = /禁军|禁卫|将军|大将|上将|元帅|都督|总兵|校尉|都尉|军侯|偏将|裨将|督师|经略|领军|护军/;
  var _DEATH_ALLY_FRIEND = 80;
  var _DEATH_ALLY_TRUST = 70;

  function _isMilitaryNpc(npc) {
    if (!npc) return false;
    var bag = ((npc.officialTitle || '') + ' ' + (npc.title || '') + ' ' + (npc.role || ''));
    return _MILITARY_RE.test(bag);
  }

  function _isDeathAlly(playerName, npcName) {
    var npcCh = _findChar(npcName);
    if (!npcCh) return false;
    var nd = _ensureDims(npcCh, _canonName(playerName));
    if (!nd) return false;
    if ((nd.friend || 50) < _DEATH_ALLY_FRIEND) return false;
    // trust：优先读 relations.trust·缺席用 dims.colleague 兜底
    var trust = 50;
    try {
      if (typeof ensureCharRelation === 'function') {
        var r = ensureCharRelation(_canonName(npcName), _canonName(playerName));
        if (r && typeof r.trust === 'number') trust = r.trust;
      }
    } catch (_) {}
    if (trust < _DEATH_ALLY_TRUST) {
      // 兜底·用 dims.colleague 当 trust 近似
      if ((nd.colleague || 50) < _DEATH_ALLY_TRUST) return false;
    }
    return true;
  }

  function _checkEventHook(playerName, npcName, kind, payload) {
    var hooks = [];

    // 钩子 1：禁军将领 + 死党 + 密谈 → 政变提示
    if (kind === 'secretTalk') {
      var npcCh = _findChar(npcName);
      if (_isMilitaryNpc(npcCh) && _isDeathAlly(playerName, npcName)) {
        hooks.push({
          id: 'coup_hint',
          severity: 'critical',
          message: '与' + npcName + '交情已达死党·且为军中将领·可密谋发动政变（具体路径由剧本 hook）',
          payload: { player: playerName, npc: npcName, kind: 'coup', intent: payload.intent || '' }
        });
      }
    }

    // 钩子 2：陷害成功 → 触发 NPC 反弹（剧本 hook 具体后果）
    if (kind === 'frame') {
      hooks.push({
        id: 'frame_backlash',
        severity: 'warning',
        message: '陷害' + npcName + '·若败露将结死仇·剧本可 hook 反弹事件',
        payload: { player: playerName, npc: npcName, kind: 'frame_backlash' }
      });
    }

    return hooks.length ? hooks : null;
  }

  // ── 主入口 interact ─────────────────────────────────────────
  function interact(npcName, kind, payload) {
    payload = payload || {};

    if (!KINDS[kind]) return { ok: false, reason: '未知互动类型: ' + kind };
    if (!_isTransmigration()) return { ok: false, reason: '非穿越模式' };
    if (!npcName) return { ok: false, reason: '未指定 NPC' };

    var pi = null;
    try { if (typeof P !== 'undefined' && P && P.playerInfo) pi = P.playerInfo; } catch (_) {}
    if (!pi || !pi.characterName) return { ok: false, reason: '玩家信息未就绪' };

    var playerName = pi.characterName;
    var playerCh = _findChar(playerName);
    var npcCh = _findChar(npcName);
    if (!npcCh) return { ok: false, reason: '未找到 NPC: ' + npcName };
    if (npcCh.alive === false) return { ok: false, reason: 'NPC 已不在人世: ' + npcName };

    var def = KINDS[kind];

    // 1) 精力消耗
    var energyOk = _spendEnergyLocal(def.energy, def.label);
    if (!energyOk) return { ok: false, reason: '精力不足（需 ' + def.energy + '）' };

    // 2) 时间推进
    var timeRes = _advanceTime(def.time);

    // 3) LLM 场景描述
    var sceneDesc = _generateScene(playerCh, npcCh, kind, payload);

    // 4) 5 维关系值更新
    var relRes = _applyRelation(playerName, npcName, kind, payload);

    // 5) 记忆写入
    var memEntry = _writeMemory(playerName, npcName, kind, sceneDesc, def);

    // 6) 联姻特殊处理
    var marryRes = (kind === 'marry') ? _applyMarriage(playerCh, npcCh, payload) : null;

    // 7) 事件钩子
    var hooks = _checkEventHook(playerName, npcName, kind, payload);

    return {
      ok: true,
      kind: kind,
      label: def.label,
      player: playerName,
      npc: npcName,
      scene: sceneDesc,
      relation: relRes,
      memory: memEntry,
      marriage: marryRes,
      eventHooks: hooks,
      time: { hours: def.time, turnAdvanced: timeRes.turnAdvanced, turn: timeRes.turn || null },
      energy: { cost: def.energy }
    };
  }

  // ── 御案面板·列出可互动 NPC ─────────────────────────────────
  function listInteractableNpcs(opts) {
    opts = opts || {};
    if (!_isTransmigration()) return [];
    var pi = null;
    try { if (typeof P !== 'undefined' && P && P.playerInfo) pi = P.playerInfo; } catch (_) {}
    if (!pi || !pi.characterName) return [];

    var playerName = pi.characterName;
    var chars = [];
    try {
      if (typeof GM !== 'undefined' && GM && Array.isArray(GM.chars)) chars = GM.chars;
    } catch (_) {}

    var out = [];
    for (var i = 0; i < chars.length; i++) {
      var c = chars[i];
      if (!c) continue;
      if (c.name === playerName) continue;
      if (c.alive === false) continue;
      // 排除君主（玩家若非君主则不可与君主行陷害/密谋等·剧本可放开）
      var isSovereign = false;
      try {
        if (typeof _offIsSovereign === 'function') isSovereign = !!_offIsSovereign(c);
      } catch (_) {}
      if (!isSovereign && c.role === '皇帝') isSovereign = true;
      if (isSovereign && !opts.includeSovereign) continue;

      var role = '';
      try {
        if (global.TM && global.TM.Transmigration && typeof global.TM.Transmigration.derivePlayerRole === 'function') {
          role = global.TM.Transmigration.derivePlayerRole(c);
        }
      } catch (_) {}

      var dims = null;
      try {
        var d = _ensureDims(_findChar(c.name), playerName);
        if (d) dims = Object.assign({}, d);
      } catch (_) {}

      out.push({
        name: c.name,
        title: c.officialTitle || c.title || c.role || '',
        faction: c.faction || '',
        role: role,
        military: _isMilitaryNpc(c),
        dims: dims
      });
    }
    return out;
  }

  // ── 御案面板·动作菜单 ───────────────────────────────────────
  function getActionMenu(npcName) {
    var menu = [];
    Object.keys(KINDS).forEach(function (k) {
      var def = KINDS[k];
      menu.push({
        kind: k,
        label: def.label,
        energy: def.energy,
        time: def.time,
        dim: def.dim,
        dimLabel: DIMS[def.dim].label,
        importance: def.importance,
        hint: _actionHint(k, npcName)
      });
    });
    return menu;
  }

  function _actionHint(kind, npcName) {
    var def = KINDS[kind];
    switch (kind) {
      case 'visit':      return '低耗·缓步相亲';
      case 'secretTalk': return npcName ? ('与' + npcName + '密谈·若为军中将领且交情死党·或可谋大事') : '密谈·若为军中将领且交情死党或可谋大事';
      case 'entrust':    return '请托·人情往来';
      case 'befriend':   return '结交·扩亲信圈';
      case 'gift':       return '馈赠·轻礼结欢';
      case 'marry':      return '联姻·两家族结姻亲';
      case 'antagonize': return '寻仇·降亲友·升政敌';
      case 'frame':      return '陷害·升仇敌·败露结死仇';
      case 'recruit':    return '笼络·结为同党';
      case 'disciple':   return '收徒·立师徒之谊';
      default:           return def.label;
    }
  }

  // ── 查询·5 维关系值 ─────────────────────────────────────────
  function getRelationDims(npcName) {
    var pi = null;
    try { if (typeof P !== 'undefined' && P && P.playerInfo) pi = P.playerInfo; } catch (_) {}
    if (!pi || !pi.characterName) return null;
    var playerCh = _findChar(pi.characterName);
    var d = _ensureDims(playerCh, _canonName(npcName));
    if (!d) return null;
    var out = {};
    Object.keys(DIMS).forEach(function (k) {
      out[k] = { label: DIMS[k].label, value: d[k] || 50 };
    });
    return out;
  }

  // ── 导出命名空间 ────────────────────────────────────────────
  var ns = {
    KINDS: KINDS,
    DIMS: DIMS,
    interact: interact,
    listInteractableNpcs: listInteractableNpcs,
    getActionMenu: getActionMenu,
    getRelationDims: getRelationDims,
    // 暴露内部函数（smoke/调试·非游戏调用入口）
    _spendEnergyLocal: _spendEnergyLocal,
    _advanceTime: _advanceTime,
    _generateScene: _generateScene,
    _applyRelation: _applyRelation,
    _writeMemory: _writeMemory,
    _applyMarriage: _applyMarriage,
    _checkEventHook: _checkEventHook,
    _isMilitaryNpc: _isMilitaryNpc,
    _isDeathAlly: _isDeathAlly
  };

  // 双路径挂载：浏览器走 window.TM.PlayerInteraction；node smoke 走 module.exports
  try {
    if (typeof module !== 'undefined' && module && module.exports) {
      module.exports = ns;
    }
  } catch (_) {}
  try {
    if (global) {
      if (!global.TM) global.TM = {};
      global.TM.PlayerInteraction = ns;
    }
  } catch (_) {}
})(typeof globalThis !== 'undefined' ? globalThis : (typeof window !== 'undefined' ? window : this));
