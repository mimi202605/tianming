const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function assert(cond, msg) {
  if (!cond) {
    console.error('ASSERT FAIL:', msg);
    process.exit(1);
  }
}

const zhi = read('tm-renwu-tuzhi.js');
const shijiList = read('tm-shiji-qiju-ui.js');
const playerCore = read('tm-player-core.js');
const tinYi = (read('tm-tinyi-v3-persona.js') + (read('tm-tinyi-v3.js') + '\n' + read('tm-tinyi-v3-edict-personnel.js')) + read('tm-tinyi-v3-parties.js'));
const topbarVars = read('tm-topbar-vars.js');
const office = read('tm-hongyan-office.js') + '\n' + read('tm-game-ui-shell.js') + '\n' + read('tm-hongyan-edict-ui.js');
const ceming = read('tm-ceming.js');
const keju = read('tm-keju.js');

assert(zhi.includes('function scheduleZhiRosterRender'), '人物图志搜索必须调度渲染而不是每字同步 renderRoster');
const zhiSearchIdx = zhi.indexOf('onSearch:function');
const zhiFilterIdx = zhi.indexOf('onFilter:function', zhiSearchIdx);
assert(zhiSearchIdx >= 0 && zhiFilterIdx > zhiSearchIdx, '人物图志 onSearch/onFilter 必须存在');
const zhiSearchSlice = zhi.slice(zhiSearchIdx, zhiFilterIdx);
assert(zhiSearchSlice.includes('scheduleZhiRosterRender'), '人物图志 onSearch 必须调用 scheduleZhiRosterRender');
assert(!/renderRoster\s*\(\s*\)\s*;/.test(zhiSearchSlice), '人物图志 onSearch 不得同步 renderRoster');

assert(shijiList.includes('function scheduleShijiListRender'), '史记列表搜索必须调度 renderShijiList');
assert(!shijiList.includes('oninput="_sjlKw=this.value;_sjlPage=0;renderShijiList()"'), '史记列表 oninput 不得同步 renderShijiList');

assert(playerCore.includes('function scheduleFloatingShijiPanelRender'), '浮动史记搜索必须调度 _renderShijiPanel');
assert(!playerCore.includes('oninput="_shijiKw=this.value;_shijiPage=0;_renderShijiPanel()"'), '浮动史记 oninput 不得同步 _renderShijiPanel');

assert(tinYi.includes('function _ty3_schedulePaUpdateForecast'), '朝议议题预估输入必须调度刷新');
assert(!tinYi.includes('inp.oninput = _ty3_paUpdateForecast'), '朝议议题输入不得每字同步预估');

assert(topbarVars.includes('function _scheduleFilterAllVars'), '顶栏变量搜索必须调度过滤');
assert(!topbarVars.includes('oninput="_filterAllVars(this.value)"'), '顶栏变量搜索不得每字同步扫描全部变量卡片');

assert(office.includes('function _scheduleBiannianRender'), '编年搜索必须调度 renderBiannian');
assert(!office.includes('oninput="renderBiannian()"'), '编年搜索不得每字同步 renderBiannian');
assert(office.includes('function _scheduleWenyuanRender'), '文苑搜索必须调度 renderWenyuan');
assert(!office.includes('oninput="renderWenyuan()"'), '文苑搜索不得每字同步 renderWenyuan');
assert(office.includes('function _scheduleQijuRender'), '起居注搜索必须调度 renderQiju');
assert(!office.includes('oninput="_qijuKw=this.value;_qijuPage=0;renderQiju()"'), '起居注搜索不得每字同步 renderQiju');
assert(office.includes('function _scheduleJishiRender'), '纪事搜索必须调度 renderJishi');
assert(!office.includes('oninput="_jishiKw=this.value;_jishiPage=0;renderJishi();"'), '纪事搜索不得每字同步 renderJishi');

assert(ceming.includes('TM.ceming._scheduleLibKeyword'), 'ceming library search must debounce tab rerender');
assert(!ceming.includes('oninput="TM.ceming._setLibKeyword(this.value)"'), 'ceming library search must not rerender on every keystroke');

assert(keju.includes('function _scheduleDelegateFilter'), 'keju delegate search must schedule DOM filtering');
assert(!keju.includes('oninput="_filterDelegateList(this.value)"'), 'keju delegate search must not filter rows on every keystroke');

console.log('smoke-typing-lag-guards OK');
