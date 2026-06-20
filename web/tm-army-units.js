/* tm-army-units.js — 御驾亲征接入 · Phase 0「编制地基」
 * 把 army 现有 composition:[{type,count}] 派生为持久 units[](队·每队≤1000人·"填满+余数")。
 * composition 原样保留(作自动同步摘要·所有现成读者不受影响);units[] 是接入实时战术战斗的数据脊梁。
 * 兵种识别走「五级瀑布」(见集成设计文档 §3/§12.2):①结构化标签 ②字根/部首(主力·朝代中立) ③装备反推 ④LLM(待Phase4) ⑤杂兵兜底。
 * 朝代中立(CLAUDE.md 红线):识别匹配字根非整词·不锁单朝。纯数据派生·载入时一次性·幂等·永不崩(失败保留 composition·不破存档)。
 * 此文件只定义 window.TMArmyUnits·不改任何 composition 读者·零运行时行为变更(无消费方时纯增量)。
 */
(function () {
  'use strict';

  /* 字根表(§12.2)·望文生义匹配字根而非整词→杜撰词(象兵/白杆兵/藤甲)多被接住 */
  /* 「枪」一字两义:长枪(冷兵)vs 火枪(枪械)。FIREARM_QIANG=火器语境的「枪」(燧发枪/步枪/火绳枪…)→归 musket·非长枪 */
  var FIREARM_QIANG = /(?:燧发|火绳|火|步|手|洋|排|滑膛|线膛|来复|毛瑟|卡宾|机关|机|冲锋|猎|霰弹|连珠|转轮|自动|半自动|加特林|马克沁)枪/;
  var RX = {
    art:      /炮|砲|熕|红夷|佛朗机|虎蹲|楼车|车营|回回|砲车/,
    /* 近代火器步兵(无「枪」字者):掷弹兵/散兵/猎兵/线列…直接归 musket;带「枪」者经 FIREARM_QIANG 消歧 */
    musket:   new RegExp('铳|鸟铳|三眼|火器|火铳|铅子|铅弹|快枪|神机|线列|排铳|掷弹|散兵|猎兵|' + FIREARM_QIANG.source),
    crossbow: /弩|神臂|劲弩|床弩/,
    bow:      /弓|矢|箭|射/,
    halberd:  /戟|镋|钯|筅|狼筅/,
    spear:    /枪|矛|槊|殳|杆/,
    sword:    /刀|剑|牌|盾|斧|锤|镖/,
    horse:    /骑|马|骠|骁|驎|拐子/
  };
  /* 长枪判定:有矛/槊/殳/杆=真长枪;有「枪」须剔除火器枪后仍余独立「枪」才算(燧发枪兵→火铳·非长枪;长枪+燧发枪混编→长枪+火铳) */
  function hasSpear(s) {
    if (/矛|槊|殳|杆/.test(s)) return true;
    if (!/枪/.test(s)) return false;
    return /枪/.test(s.replace(new RegExp(FIREARM_QIANG.source, 'g'), ''));
  }
  /* 修饰位(独立叠 flag·不改基础桶) */
  var MOD = {
    guard:   /御营|亲军|禁卫|羽林|大内|宿卫|锦衣/,
    elite:   /卫|锐|陷|牙|亲|家丁|白甲|护军|选锋|精|劲|敢死|背嵬/,
    heavy:   /甲|铁|具装|重装|浮屠|铁浮|重甲|铁骑/,
    shield:  /牌|盾|藤牌/,
    baggage: /辎|辅|夫|工|粮|弹药|运卒|辎重|民壮/
  };

  /* 兵种识别瀑布 → {arm(step/cav/bow/art/guard), sub, flags[], src} */
  function classifyUnitType(typeStr, army) {
    var s = String(typeStr == null ? '' : typeStr);
    var flags = [];
    if (MOD.elite.test(s))   flags.push('elite');
    if (MOD.heavy.test(s))   flags.push('heavy');
    if (MOD.shield.test(s))  flags.push('shield');
    if (MOD.baggage.test(s)) flags.push('baggage');

    /* level1:结构化标签优先(若 composition 条目带显式 unitTypeId/arm 枚举) */
    // (当前 composition 仅 {type,count}·留接口·暂无结构化枚举)

    /* 御营/亲军 → guard(独立兵种) */
    if (MOD.guard.test(s)) return { arm: 'guard', sub: 'guard', flags: flags, src: 'radical' };

    /* 机枪/速射火器:明确火器·先于骑射(否则"马克沁机枪"的「马」被当战马误判骑射) */
    if (/机枪|加特林|马克沁/.test(s)) return { arm: 'bow', sub: 'musket', flags: flags, src: 'radical' };

    /* 骑射特办:有"骑/马"且有远程字根(弓/弩/铳)→骑射(cav·骑射手)·先于字根顺序(否则"弓骑"被弓抢成步弓) */
    if (RX.horse.test(s) && (RX.bow.test(s) || RX.crossbow.test(s) || RX.musket.test(s)))
      return { arm: 'cav', sub: 'horse', flags: flags, src: 'radical' };

    /* 骑乘近战:有"骑"且有近战字根(枪/矛/刀/槊/戟…)→骑兵(枪骑兵=lancer·非步兵长枪·先于步兵字根·用「骑」非「马」避开马克沁等) */
    if (/骑/.test(s) && (hasSpear(s) || RX.sword.test(s) || RX.halberd.test(s)))
      return { arm: 'cav', sub: (flags.indexOf('heavy') >= 0 ? 'heavy' : (flags.indexOf('elite') >= 0 ? 'shock' : 'horse')), flags: flags, src: 'radical' };

    var arm = null, sub = null;
    /* level2:字根(主力)·优先级 高→低 */
    if (RX.art.test(s))           { arm = 'art';  sub = 'cannon'; }
    else if (RX.musket.test(s))   { arm = 'bow';  sub = 'musket'; }
    else if (RX.crossbow.test(s)) { arm = 'bow';  sub = 'crossbow'; }
    else if (RX.bow.test(s))      { arm = 'bow';  sub = 'bow'; }
    else if (RX.halberd.test(s))  { arm = 'step'; sub = 'halberd'; }
    else if (hasSpear(s))         { arm = 'step'; sub = 'spear'; }
    else if (RX.horse.test(s))    { arm = 'cav';  sub = (flags.indexOf('heavy') >= 0 ? 'heavy' : (flags.indexOf('elite') >= 0 ? 'shock' : 'horse')); }
    else if (RX.sword.test(s))    { arm = 'step'; sub = 'sword'; }

    if (arm) return { arm: arm, sub: sub, flags: flags, src: 'radical' };

    /* level3:装备反推(名字不透明→翻母军 equipment[]) */
    var eq = army && army.equipment;
    if (Array.isArray(eq) && eq.length) {
      var ej = eq.join(' ');
      if (RX.art.test(ej))           return { arm: 'art',  sub: 'cannon',   flags: flags, src: 'equipment' };
      if (RX.musket.test(ej))        return { arm: 'bow',  sub: 'musket',   flags: flags, src: 'equipment' };
      if (RX.horse.test(ej) || /战马|乘马/.test(ej)) return { arm: 'cav', sub: (flags.indexOf('heavy') >= 0 ? 'heavy' : 'horse'), flags: flags, src: 'equipment' };
      if (RX.crossbow.test(ej))      return { arm: 'bow',  sub: 'crossbow', flags: flags, src: 'equipment' };
      if (RX.bow.test(ej))           return { arm: 'bow',  sub: 'bow',      flags: flags, src: 'equipment' };
      if (RX.spear.test(ej))         return { arm: 'step', sub: 'spear',    flags: flags, src: 'equipment' };
    }

    /* level4:LLM 归类(记忆化)— 待 Phase 4 接次级 LLM·此处先落底 */
    /* level5:杂兵兜底(中庸近战·无专长 flag)·永不崩 */
    flags.push('miscellaneous');
    return { arm: 'step', sub: 'sword', flags: flags, src: 'fallback' };
  }

  /* 检测一个条目里出现的「非骑」武器类别(按优先级·去重)→ 供混编拆分。刀/牌同属短兵(只记一次) */
  function detectWeaponCats(s) {
    var cats = [];
    function add(arm, sub) { for (var i = 0; i < cats.length; i++) if (cats[i].sub === sub) return; cats.push({ arm: arm, sub: sub }); }
    if (RX.art.test(s))      add('art', 'cannon');
    if (RX.musket.test(s))   add('bow', 'musket');
    if (RX.crossbow.test(s)) add('bow', 'crossbow');
    if (RX.bow.test(s))      add('bow', 'bow');
    if (RX.halberd.test(s))  add('step', 'halberd');
    if (hasSpear(s))         add('step', 'spear');
    if (RX.sword.test(s))    add('step', 'sword');
    return cats;
  }

  /* 混编拆分(§12.2):一个 composition 条目含多种武器字根(如"长矛刀牌"/"弓弩手")→拆成多兵种·按权重分人数。
   * 骑/御营/杂兵/装备反推得来者不拆(单一);多武器才拆·首类(主武器)略加权。 */
  function splitTypeMix(typeStr, army) {
    var s = String(typeStr == null ? '' : typeStr);
    var single = classifyUnitType(s, army);
    if (single.arm === 'guard' || single.arm === 'cav' || single.src === 'fallback' || single.src === 'equipment')
      return [{ arm: single.arm, sub: single.sub, flags: single.flags.slice(), weight: 1, src: single.src }];
    var cats = detectWeaponCats(s);
    if (cats.length <= 1)
      return [{ arm: single.arm, sub: single.sub, flags: single.flags.slice(), weight: 1, src: single.src }];
    return cats.map(function (c, i) {
      return { arm: c.arm, sub: c.sub, flags: single.flags.slice(), weight: (i === 0 ? 1.2 : 1), src: 'mixed' };
    });
  }

  /* 一段人数 → 队 size 列表(填满+余数·≤1000)+ 防碎牌(§12.1:余队<200 并入同兵种相邻队) */
  function splitMen(total) {
    var sizes = [], rem = Math.max(0, Math.round(total));
    while (rem > 0) { var men = Math.min(1000, rem); sizes.push(men); rem -= men; }
    if (sizes.length >= 2 && sizes[sizes.length - 1] < 200) { sizes[sizes.length - 2] += sizes.pop(); }   // 防碎牌:尾队<200并入前队(宁可一队略超编·不留幽灵小队)
    return sizes;
  }

  /* 历练初值(§12.3)·按品质映射(新募~15·精锐稀有) */
  function vetFromQuality(q) {
    q = String(q == null ? '' : q);
    if (/精锐|百战|劲旅/.test(q)) return 55;
    if (/精兵/.test(q)) return 40;
    if (/普通/.test(q)) return 25;
    if (/新兵|新募|乌合|老弱|羸|疲|屯田/.test(q)) return 15;
    return 20;
  }

  /* composition → units[]:混编拆分(§12.2)→每兵种"填满+余数"切队(≤1000)+防碎牌(§12.1)·总人数守恒 */
  function deriveArmyUnits(army) {
    if (!army) return [];
    var comp = (army.composition && Array.isArray(army.composition) && army.composition.length) ? army.composition : null;
    if (!comp) {
      /* 无 composition → 用总兵力兜底成一种(永不崩) */
      var tot0 = Math.max(0, Math.round(army.soldiers || army.strength || army.size || 0));
      if (!tot0) return [];
      comp = [{ type: army.quality || '杂兵', count: tot0 }];
    }
    var units = [], uid = 0, vet = vetFromQuality(army.quality), aid = army.id || army.name || 'army';
    comp.forEach(function (c) {
      var type = (c && (c.type || c.unitTypeId)) || '杂兵';
      var count = Math.max(0, Math.round((c && c.count) || 0));
      if (!count) return;
      var parts = splitTypeMix(type, army);          // 混编→多兵种(单一则1个)
      var wsum = 0; parts.forEach(function (p) { wsum += p.weight; });
      var alloc = 0;
      parts.forEach(function (p, pi) {
        var pc = (pi === parts.length - 1) ? (count - alloc) : Math.round(count * p.weight / wsum);   // 末部分领余数→总数守恒
        alloc += pc;
        if (pc <= 0) return;
        splitMen(pc).forEach(function (men) {        // 填满+余数+防碎牌
          units.push({
            id: aid + '#u' + (uid++),
            番号: type, name: type,
            arm: p.arm, sub: p.sub, tacClass: p.arm + '/' + p.sub, flags: p.flags.slice(),
            men: men, 历练: vet,
            status: men >= 1000 ? '满编' : '不满编',
            parentArmyId: aid
          });
        });
      });
    });
    return units;
  }

  /* 派生源签名(composition + 总兵力 + 品质):源一变→签名变→下次 ensure 自动重派。
   * ★这是应对「玩家扩军裁军」+「AI 高自由度推演改军」的关键:units[] 是派生视图·按源签名自愈·
   *   无须在 660 文件里逐个 mutation 点埋同步钩(AI 自由度高必漏)·渲染时 ensure 即得最新。 */
  function compSig(army) {
    var c = army && army.composition;
    var base = (Array.isArray(c) && c.length)
      ? c.map(function (x) { return (x && (x.type || x.unitTypeId) || '') + ':' + Math.round((x && x.count) || 0); }).join('|')
      : 'S';
    return base + '#' + Math.round((army && (army.soldiers || army.strength || army.size)) || 0) + '@' + String((army && army.quality) || '');
  }
  /* 幂等 + 自愈:无 units[] / 源签名变 / 标脏 → 重派;否则原样返回(渲染热路径可放心每帧调) */
  function ensureArmyUnits(army) {
    if (!army) return [];
    var sig = compSig(army);
    if (!Array.isArray(army.units) || army._unitsSig !== sig || army._unitsStale) {
      army.units = deriveArmyUnits(army);
      army._unitsSig = sig;
      army._unitsStale = false;
    }
    return army.units;
  }

  /* 全军派生(载入钩子用)·永不崩:单军失败保留 composition·置空 units·不阻断其余 */
  function ensureAllArmies(GMref) {
    var g = GMref || (typeof GM !== 'undefined' ? GM : (typeof window !== 'undefined' ? window.GM : null));
    var ok = 0, fail = 0;
    if (g && Array.isArray(g.armies)) {
      for (var i = 0; i < g.armies.length; i++) {
        var a = g.armies[i];
        try { ensureArmyUnits(a); ok++; }
        catch (e) { fail++; if (a && !Array.isArray(a.units)) a.units = []; }
      }
    }
    return { ok: ok, fail: fail };
  }

  var API = {
    deriveArmyUnits: deriveArmyUnits,
    ensureArmyUnits: ensureArmyUnits,
    ensureAllArmies: ensureAllArmies,
    classifyUnitType: classifyUnitType,
    vetFromQuality: vetFromQuality,
    compSig: compSig
  };
  if (typeof window !== 'undefined') window.TMArmyUnits = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})();
