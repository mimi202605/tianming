// smoke-imageapi-test-buttons.js — 生图设置页两个测试按钮的防回归（2026-07-11）
// 定罪案：_sTestImgConn/_sDetectImgCap 曾写死 size 256x256——低于方舟 seedream 最小面积
// （实测报错 image area must be at least 921600 pixels）也低于 dall-e-3 下限 1024²，
// 致「测试连接/检测生图功能」对配置完全正确的玩家必失败；且两钮读已保存配置·填而未存则测到旧值。
// 断言（源码级）：① 检测生图用 1024x1024 且不再出现 256x256；② 测试连接对「尺寸类 400/422」
// 判定为连接正常（探测不计费语义）；③ 两钮都先 _sSaveImgAPI 落盘再测。
const fs = require('fs');
const path = require('path');

const src = fs.readFileSync(path.join(__dirname, '..', 'tm-patches.js'), 'utf8');
let pass = 0, fail = 0;
function ok(cond, name) {
  if (cond) { pass++; console.log('  ok· ' + name); }
  else { fail++; console.log('  FAIL· ' + name); }
}

function fnBody(name) {
  const i = src.indexOf('function ' + name);
  if (i < 0) return '';
  return src.slice(i, src.indexOf('\nasync function', i + 10) > 0
    ? src.indexOf('\nasync function', i + 10)
    : src.indexOf('\nfunction', i + 10));
}

function stripComments(s) { return s.replace(/\/\/[^\n]*/g, ''); }
const testConn = fnBody('_sTestImgConn');
const detectCap = fnBody('_sDetectImgCap');
const detectCapCode = stripComments(detectCap); // 注释里允许提历史值·代码里不允许

ok(testConn.length > 0, '_sTestImgConn 存在');
ok(detectCap.length > 0, '_sDetectImgCap 存在');
ok(detectCap.indexOf('1024x1024') >= 0, '检测生图用 1024x1024（≥方舟 seedream 92 万像素下限·≥dall-e-3 下限）');
ok(detectCapCode.indexOf('256x256') < 0, '检测生图代码不再出现 256x256（0217837649… 定罪案·注释除外）');
ok(/400|422/.test(testConn) && /size\|pixel|pixel\|/i.test(testConn), '测试连接把「尺寸类 400/422」判为连接正常（免计费探测语义）');
ok(testConn.indexOf('_sSaveImgAPI') >= 0, '测试连接先落盘栏位再测（治填而未存测到旧配置）');
ok(detectCap.indexOf('_sSaveImgAPI') >= 0, '检测生图先落盘栏位再测');
ok(/401|403/.test(testConn), '测试连接对 401/403 有 Key 无效提示');

console.log('[smoke-imageapi-test-buttons] ' + (fail === 0 ? 'PASS' : 'FAIL') + ' ' + pass + '/' + (pass + fail));
process.exit(fail === 0 ? 0 : 1);
