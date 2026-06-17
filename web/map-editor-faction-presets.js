// map-editor-faction-presets.js
// Phase 25.4·朝代势力预置 (历史色)
//
// 按 dynasty.id·提供史上典型势力 + 史色
// 自动·切朝代时若 map.factions 空·载预置·user 改 / 增删自由
//
// 史色取信旗色 / 五行 / 史画习惯·非纯臆造
//
// 2026-05-08

(function(global){
  'use strict';

  var ME = global.TM && global.TM.MapEditor;
  if (!ME){ console.error('[faction-presets] core not loaded'); return; }

  // ─── 各朝代典型势力·色 ────────────────────────────

  var PRESETS = {
    // 明 (崇祯)·1627-1644·农民战争 + 后金崛起
    ming: [
      { id: 'ming',     name: '大明',       shortName: '明', color: '#c8442c', type: 'kingdom', desc: '中央朝廷·朱明' },
      { id: 'houjin',   name: '后金/清',    shortName: '金', color: '#d4b045', type: 'kingdom', desc: '建州女真·1636 称清' },
      { id: 'dashun',   name: '大顺',       shortName: '顺', color: '#8a3030', type: 'kingdom', desc: '李自成·1644 入北京' },
      { id: 'daxi',     name: '大西',       shortName: '西', color: '#a05848', type: 'kingdom', desc: '张献忠·1644 入蜀' },
      { id: 'chahaer',  name: '察哈尔',     shortName: '察', color: '#5a6a8a', type: 'tribe',   desc: '林丹汗·1634 亡于后金' },
      { id: 'tumed',    name: '土默特',     shortName: '土', color: '#6a7a98', type: 'tribe',   desc: '右翼蒙古' },
      { id: 'kharkha',  name: '喀尔喀',     shortName: '喀', color: '#7a8aa8', type: 'tribe',   desc: '外蒙古三部' },
      { id: 'oirat',    name: '卫拉特',     shortName: '卫', color: '#5a7090', type: 'tribe',   desc: '西部蒙古' },
      { id: 'chaoxian', name: '朝鲜',       shortName: '朝', color: '#8a9a5a', type: 'kingdom', desc: '李氏王朝' },
      { id: 'riben',    name: '日本',       shortName: '日', color: '#b87878', type: 'kingdom', desc: '德川幕府' },
      { id: 'lunan',    name: '吕宋',       shortName: '吕', color: '#9a8848', type: 'power',   desc: '西班牙殖民地' },
      { id: 'hongmao',  name: '红毛番',     shortName: '红', color: '#a06860', type: 'power',   desc: '荷兰东印度公司·台南' },
      { id: 'fulang',   name: '佛朗机',     shortName: '佛', color: '#9a5a40', type: 'power',   desc: '葡·澳门' }
    ],

    // 清·1644-1912·考虑前期
    qing: [
      { id: 'qing',     name: '大清',       shortName: '清', color: '#d4b045', type: 'kingdom' },
      { id: 'sanfan',   name: '三藩',       shortName: '藩', color: '#a04848', type: 'kingdom', desc: '吴 / 耿 / 尚' },
      { id: 'zhengshi', name: '郑氏',       shortName: '郑', color: '#7088a0', type: 'kingdom', desc: '台湾·1683 平' },
      { id: 'zhungar',  name: '准噶尔',     shortName: '准', color: '#5a7090', type: 'tribe' },
      { id: 'eluosi',   name: '俄罗斯',     shortName: '俄', color: '#a85a5a', type: 'power' },
      { id: 'chaoxian', name: '朝鲜',       shortName: '朝', color: '#8a9a5a', type: 'kingdom' }
    ],

    // 唐·618-907
    tang: [
      { id: 'tang',     name: '大唐',       shortName: '唐', color: '#c66838', type: 'kingdom' },
      { id: 'tujue',    name: '突厥',       shortName: '突', color: '#7a8aa8', type: 'tribe' },
      { id: 'tubo',     name: '吐蕃',       shortName: '蕃', color: '#9a6a4a', type: 'kingdom' },
      { id: 'huihe',    name: '回纥',       shortName: '回', color: '#b89048', type: 'tribe' },
      { id: 'nanzhao',  name: '南诏',       shortName: '诏', color: '#5a8068', type: 'kingdom' },
      { id: 'gaoli',    name: '高句丽',     shortName: '高', color: '#8a9a5a', type: 'kingdom' },
      { id: 'bohai',    name: '渤海',       shortName: '渤', color: '#688098', type: 'kingdom' }
    ],

    // 宋 (北 / 南)
    song: [
      { id: 'song',     name: '大宋',       shortName: '宋', color: '#c84848', type: 'kingdom' },
      { id: 'liao',     name: '辽',         shortName: '辽', color: '#5a6a8a', type: 'kingdom' },
      { id: 'jin',      name: '金',         shortName: '金', color: '#b89048', type: 'kingdom' },
      { id: 'xixia',    name: '西夏',       shortName: '夏', color: '#9a7848', type: 'kingdom' },
      { id: 'menggu',   name: '蒙古',       shortName: '蒙', color: '#6a7a98', type: 'tribe' },
      { id: 'dali',     name: '大理',       shortName: '理', color: '#5a8068', type: 'kingdom' },
      { id: 'gaoli',    name: '高丽',       shortName: '高', color: '#8a9a5a', type: 'kingdom' }
    ],

    // 元
    yuan: [
      { id: 'yuan',     name: '大元',       shortName: '元', color: '#c8a040', type: 'kingdom' },
      { id: 'gaoli',    name: '高丽',       shortName: '高', color: '#8a9a5a', type: 'kingdom' },
      { id: 'riben',    name: '日本',       shortName: '日', color: '#b87878', type: 'kingdom' },
      { id: 'xizang',   name: '乌斯藏',     shortName: '藏', color: '#9a6a4a', type: 'kingdom' }
    ],

    // 三国
    sanguo: [
      { id: 'wei',      name: '魏',         shortName: '魏', color: '#c8a040', type: 'kingdom' },
      { id: 'shu',      name: '蜀汉',       shortName: '蜀', color: '#c84848', type: 'kingdom' },
      { id: 'wu',       name: '东吴',       shortName: '吴', color: '#488080', type: 'kingdom' },
      { id: 'gongsun',  name: '公孙',       shortName: '公', color: '#7088a0', type: 'kingdom' },
      { id: 'shanyue',  name: '山越',       shortName: '越', color: '#5a8068', type: 'tribe' }
    ],

    // 汉
    han: [
      { id: 'han',      name: '大汉',       shortName: '汉', color: '#c84848', type: 'kingdom' },
      { id: 'xiongnu',  name: '匈奴',       shortName: '匈', color: '#7a8aa8', type: 'tribe' },
      { id: 'xiyu',     name: '西域诸国',   shortName: '西', color: '#9a8048', type: 'tribe' },
      { id: 'chaoxian', name: '卫氏朝鲜',   shortName: '朝', color: '#8a9a5a', type: 'kingdom' },
      { id: 'nanyue',   name: '南越',       shortName: '南', color: '#488080', type: 'kingdom' }
    ],

    // 秦
    qin: [
      { id: 'qin',      name: '秦',         shortName: '秦', color: '#3a3038', type: 'kingdom' },
      { id: 'chu',      name: '楚',         shortName: '楚', color: '#a05848', type: 'kingdom' },
      { id: 'qi',       name: '齐',         shortName: '齐', color: '#688098', type: 'kingdom' },
      { id: 'yan',      name: '燕',         shortName: '燕', color: '#7088a0', type: 'kingdom' },
      { id: 'zhao',     name: '赵',         shortName: '赵', color: '#5a6a8a', type: 'kingdom' },
      { id: 'wei',      name: '魏',         shortName: '魏', color: '#c8a040', type: 'kingdom' },
      { id: 'han',      name: '韩',         shortName: '韩', color: '#9a7848', type: 'kingdom' }
    ],

    // 春秋
    chunqiu: [
      { id: 'zhou',     name: '周',         shortName: '周', color: '#c84848', type: 'kingdom' },
      { id: 'qi',       name: '齐',         shortName: '齐', color: '#688098', type: 'kingdom' },
      { id: 'jin',      name: '晋',         shortName: '晋', color: '#9a7848', type: 'kingdom' },
      { id: 'qin',      name: '秦',         shortName: '秦', color: '#3a3038', type: 'kingdom' },
      { id: 'chu',      name: '楚',         shortName: '楚', color: '#a05848', type: 'kingdom' },
      { id: 'song',     name: '宋',         shortName: '宋', color: '#7088a0', type: 'kingdom' },
      { id: 'lu',       name: '鲁',         shortName: '鲁', color: '#b89048', type: 'kingdom' },
      { id: 'wei',      name: '卫',         shortName: '卫', color: '#688068', type: 'kingdom' },
      { id: 'wu',       name: '吴',         shortName: '吴', color: '#488080', type: 'kingdom' },
      { id: 'yue',      name: '越',         shortName: '越', color: '#5a8068', type: 'kingdom' }
    ]
  };

  // ─── load / preview ────────────────────────────────────

  function listFor(dynastyId){
    return PRESETS[dynastyId] || [];
  }

  function loadFor(dynastyId, opts){
    opts = opts || {};
    var list = PRESETS[dynastyId] || [];
    if (!list.length){
      if (global.meToast) meToast('该朝代无预置势力', 'warn');
      return 0;
    }
    var F = TM.MapEditor.factions;
    if (!F) return 0;
    if (opts.replace || !F.list().length){
      F.bulkLoad(list);
    } else {
      // 增量·只补缺
      list.forEach(function(spec){
        if (!F.get(spec.id)) F.add(spec);
      });
    }
    if (global.meToast){
      meToast('载入·' + dynastyId + ' 朝·' + list.length + ' 势力', 'success', 1800);
    }
    ME.requestRender();
    return list.length;
  }

  // 不再 auto-load·factions 唯一来源是剧本 (map.factions[])
  // 用户手动·panel 按钮 / 新建剧本时载

  // ─── init ──────────────────────────────────────────────

  function init(){
    // 无自动 hook·factions 跟剧本走
    // 留 maybeAutoLoad 给"新建剧本"等显式调用
  }

  // 显式·新剧本时调·若 factions 空且有 dynasty preset·询问 / 载
  function maybeAutoLoad(){
    var map = ME.EDITOR.map;
    if (!map) return false;
    if (map.factions && map.factions.length) return false;
    return loadFor(map.dynasty) > 0;
  }

  // ─── expose ────────────────────────────────────────────

  global.TM = global.TM || {};
  global.TM.MapEditor = global.TM.MapEditor || {};
  global.TM.MapEditor.factionPresets = {
    init: init,
    PRESETS: PRESETS,
    listFor: listFor,
    loadFor: loadFor,
    maybeAutoLoad: maybeAutoLoad
  };

})(typeof window !== 'undefined' ? window : this);
