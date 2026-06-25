// smoke-coastal-raid.js — P1-A3b 沿海袭击结算断言(2026-06-20)
//   沿海判定 + 夏秋风季 + 海防双重保护(概率慑止+损失抵扣) + 内陆不袭 + 非风季不袭 + 事件栏 + 开关守卫
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
const SRC = path.join(__dirname, '..', 'tm-coastal-raid.js');
global.window = global;
vm.runInThisContext(fs.readFileSync(SRC, 'utf8'), { filename: 'tm-coastal-raid.js' });
if (!global.CoastalRaid || typeof CoastalRaid.tick !== 'function') { console.log('FAIL: CoastalRaid 未加载'); process.exit(1); }

// mock：Math.random=0 必触发(0 < raidChance)·addEB 计数
var _origRandom = Math.random;
Math.random = function () { return 0; };
var ebCalls = [];
global.addEB = function (cat, txt) { ebCalls.push(cat + ':' + txt); };

function mkLeaves() {
  return {
    富海: { id: 'fh', name: '富海', coastalDefense: 0, minxin: 60, economyBase: { maritimeTradeVolume: 100000, commerceVolume: 40000 } },
    坚海: { id: 'jh', name: '坚海', coastalDefense: 5, minxin: 60, economyBase: { maritimeTradeVolume: 100000, commerceVolume: 40000 } },
    内陆: { id: 'nl', name: '内陆', minxin: 60, economyBase: { commerceVolume: 40000 } }   // 无 coastalDefense·无海贸
  };
}
function setup(month, leavesObj) {
  global.GM = { turn: 3, month: month, adminHierarchy: { player: { divisions: [leavesObj.富海, leavesObj.坚海, leavesObj.内陆] } } };
  global.IntegrationBridge = {
    getLeafDivisions: function (ah, fid) {
      var fac = ah[fid] || {}; if (!fac.divisions) return [];
      var out = []; (function w(l){ l.forEach(function(n){ var k=n.divisions||n.children; if(k&&k.length)w(k); else out.push(n); }); })(fac.divisions);
      return out;
    }
  };
}

// ── T1：开关关·不算 ──
var L0 = mkLeaves(); setup(7, L0);
global.P = { conf: { coastalRaidEnabled: false } };
CoastalRaid.tick();
var T1 = (L0.富海.economyBase.maritimeTradeVolume === 100000 && ebCalls.length === 0);

// ── 开关开·夏秋季(7月)·必触发 ──
var L = mkLeaves(); setup(7, L);
global.P.conf.coastalRaidEnabled = true;
ebCalls.length = 0;
CoastalRaid.tick();
var fuLoot = 100000 - L.富海.economyBase.maritimeTradeVolume;   // 富海(海防0)海贸损失
var jianLoot = 100000 - L.坚海.economyBase.maritimeTradeVolume; // 坚海(海防5)海贸损失
console.log('[A3b] 富海(海防0)海贸损=' + fuLoot + '·民心=' + L.富海.minxin + ' · 坚海(海防5)海贸损=' + jianLoot + '·民心=' + L.坚海.minxin + ' · 内陆海贸=' + (L.内陆.economyBase.maritimeTradeVolume || '无(未袭)') + ' · 事件=' + ebCalls.length);

var T2 = (fuLoot > 0);                                          // 沿海触发劫掠
var T3 = (jianLoot > 0 && jianLoot < fuLoot);                   // 海防5抵扣·损失<海防0
var T4 = (L.内陆.economyBase.maritimeTradeVolume == null && L.内陆.minxin === 60);  // 内陆非沿海·不袭
var T5_minxin = (L.富海.minxin < 60);                           // 被劫民心降
var T6 = (ebCalls.length >= 2 && ebCalls[0].indexOf('沿海袭击') === 0);  // 事件栏(富海+坚海)

// ── T7：非风季(2月)·不袭 ──
var L2 = mkLeaves(); setup(2, L2);
ebCalls.length = 0;
CoastalRaid.tick();
var T7 = (L2.富海.economyBase.maritimeTradeVolume === 100000 && ebCalls.length === 0);

Math.random = _origRandom;

console.log('  [T1] 开关关不算：' + (T1 ? 'OK' : 'FAIL'));
console.log('  [T2] 沿海触发劫掠：' + (T2 ? 'OK' : 'FAIL'));
console.log('  [T3] 海防抵扣(海防5损<海防0)：' + (T3 ? 'OK' : 'FAIL'));
console.log('  [T4] 内陆非沿海不袭：' + (T4 ? 'OK' : 'FAIL'));
console.log('  [T5] 被劫民心降：' + (T5_minxin ? 'OK' : 'FAIL'));
console.log('  [T6] 事件栏可见(沿海袭击)：' + (T6 ? 'OK' : 'FAIL'));
console.log('  [T7] 非风季(2月)不袭：' + (T7 ? 'OK' : 'FAIL'));
var all = T1 && T2 && T3 && T4 && T5_minxin && T6 && T7;
console.log('\n=== ' + (all ? 'ALL PASS' : 'FAIL') + ' ===');
process.exit(all ? 0 : 1);
