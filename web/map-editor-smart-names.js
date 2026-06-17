// map-editor-smart-names.js
// Phase 19.5·smart names
//
// 替代 V001/V002 这类机械名·按 cell 位置 + 朝代风格起名
// 核·分 5 区 (北 / 南 / 东 / 西 / 中)·查 region 词库·加朝代后缀
//
// applyToCurrentMap({ filterPattern: /^V\d+$/, dynastyId })
//   按 currrent map 重命名匹配的 division
//
// 2026-05-06

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[smart-names] core not loaded'); return; }

  // ─── word bank·按方位 5 区 ────────────────────────────

  var WORD_BANK = {
    NE: ['幽', '燕', '辽', '渔阳', '上谷', '范阳', '涿', '安东'],
    NW: ['朔', '云', '代', '雁门', '河西', '凉', '陇', '上郡', '北地'],
    SE: ['吴', '会稽', '丹阳', '建康', '苏', '杭', '常', '润', '宣', '越', '婺'],
    SW: ['蜀', '巴', '汉中', '永昌', '南中', '滇', '黔', '建宁', '夜郎', '越嶲', '牂柯'],
    C:  ['河南', '汴', '洛', '郑', '汝', '陈', '颍', '豫', '宋', '亳', '中山', '邺', '魏'],
    N:  ['河北', '冀', '赵', '常山', '清河', '巨鹿', '广平', '中山'],
    S:  ['荆', '江夏', '南郡', '武陵', '零陵', '桂阳', '长沙', '岭南', '苍梧', '南海'],
    E:  ['齐', '青', '徐', '兖', '鲁', '济北', '济南', '北海', '东莱', '琅琊'],
    W:  ['秦', '关中', '京兆', '冯翊', '扶风', '陇西', '河西']
  };

  // 后缀·按朝代风格
  var DYNASTY_SUFFIX = {
    'zhou':    ['国', ''],
    'qin':     ['郡', ''],
    'han':     ['郡', '州'],
    'wei-jin': ['郡', '州'],
    'sui':     ['郡', '州'],
    'tang':    ['道', '州', '府'],
    'wudai':   ['道', '州'],
    'song':    ['路', '府', '州', '军'],
    'liao':    ['道', '府', '州'],
    'jin':     ['路', '府', '州'],
    'xixia':   ['府', '州'],
    'yuan':    ['行省', '路', '府'],
    'ming':    ['布政司', '府', '州'],
    'qing':    ['省', '府', '州', '县'],
    'minguo':  ['省', '县', '市'],
    'shaosong':['路', '府', '州'],
    'default': ['府', '州', '路']
  };

  // ─── 分区·按 cell (x,y) 在 [0,1]^2 内 ────────────────

  function classifyZone(x, y){
    // 分 9 宫·按 x,y 落 thirds
    var col = x < 0.34 ? 'W' : x < 0.67 ? 'C' : 'E';
    var row = y < 0.34 ? 'N' : y < 0.67 ? 'C' : 'S';
    if (row === 'N' && col === 'E') return 'NE';
    if (row === 'N' && col === 'W') return 'NW';
    if (row === 'S' && col === 'E') return 'SE';
    if (row === 'S' && col === 'W') return 'SW';
    if (row === 'N' && col === 'C') return 'N';
    if (row === 'S' && col === 'C') return 'S';
    if (row === 'C' && col === 'E') return 'E';
    if (row === 'C' && col === 'W') return 'W';
    return 'C';
  }

  // ─── 挑名·避重 ────────────────────────────────────────

  function pickName(zone, used, dynastySuffix){
    var bank = (WORD_BANK[zone] || []).slice();
    // 加旁邻区 fallback
    if (!bank.length) bank = WORD_BANK.C.slice();

    // shuffle (deterministic by used count·这里·just pick first unused)
    for (var i = 0; i < bank.length; i++){
      var w = bank[i];
      var sfx = dynastySuffix[i % dynastySuffix.length];
      var name = w + sfx;
      if (!used[name]){
        used[name] = 1;
        return name;
      }
    }
    // exhausted·加方位修饰
    var cardinals = ['北', '南', '东', '西', '上', '下'];
    for (var c = 0; c < cardinals.length; c++){
      for (var k = 0; k < bank.length; k++){
        var name2 = cardinals[c] + bank[k] + dynastySuffix[0];
        if (!used[name2]){
          used[name2] = 1;
          return name2;
        }
      }
    }
    // 兜底·随机数
    var fallback = bank[0] + '_' + Math.floor(Math.random() * 1000) + dynastySuffix[0];
    used[fallback] = 1;
    return fallback;
  }

  // ─── apply·扫 map·重命名匹配 division ─────────────────

  function applyToCurrentMap(opts){
    opts = opts || {};
    var pattern = opts.filterPattern || /^V\d+$/;
    var dynastyId = opts.dynastyId || ME.EDITOR.map.dynasty || 'default';
    var sfx = DYNASTY_SUFFIX[dynastyId] || DYNASTY_SUFFIX['default'];

    var map = ME.EDITOR.map;
    var divs = map.divisions || [];
    var w = map.bitmapWidth || 1280;
    var h = map.bitmapHeight || 800;

    // 收已存名·防重
    var used = {};
    divs.forEach(function(d){ if (d.name) used[d.name] = 1; });

    var renamed = 0;
    ME.commitMutation('smart names·' + dynastyId, function(){
      divs.forEach(function(d){
        if (!d.name || !pattern.test(d.name)) return;
        if (!d.bbox) return;
        var cx = (d.bbox.x + d.bbox.w / 2) / w;
        var cy = (d.bbox.y + d.bbox.h / 2) / h;
        var zone = classifyZone(cx, cy);
        // 临时清旧名 from used
        delete used[d.name];
        var newName = pickName(zone, used, sfx);
        d.name = newName;
        renamed++;
      });
    });

    if (global.meToast){
      meToast('smart names·' + renamed + ' 省·' + dynastyId + ' 风', 'success');
    }
    return renamed;
  }

  // ─── 命令·浮 button 注入 ──────────────────────────────

  function applyAll(){
    return applyToCurrentMap({ filterPattern: /.*/ });
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.smartNames = {
    applyToCurrentMap: applyToCurrentMap,
    applyAll: applyAll,
    classifyZone: classifyZone,
    WORD_BANK: WORD_BANK,
    DYNASTY_SUFFIX: DYNASTY_SUFFIX
  };

})(typeof window !== 'undefined' ? window : this);
