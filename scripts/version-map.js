// ============================================================
// scripts/version-map.js — 四段展示版本 ↔ 三段 semver 的唯一映射（单一真相源）
//
// 背景(2026-07-04)：玩家「装新安装包打开仍旧版」根因 = package.json `version` 冻结在三段。
//   发版口径是四段 buildVersion(1.3.4.5·玩家可见/热更门基线)·但 electron-builder/NSIS/
//   electron-updater/app.getVersion() 只认三段 semver `version`。二者必须一一对应且每版递增。
//
// 映射：a.b.c.d  →  a.b.(c*100 + d)   例：1.3.4.5 → 1.3.405
//   ★硬约束 d ∈ [0,99]、c*100+d 不溢出到下一组 c——否则 1.3.4.100→1.3.500 会与 1.3.5.0→1.3.500 碰撞。
//
// release.js(写 package.json)与 verify-version-scheme.js(守卫)**都 require 本模块**·杜绝两处各写一份而漂移。
// ============================================================
'use strict';

// 四段(或更少)版本字符串 → 三段合法 semver。非法输入(段非纯数字 / d>=100 / c*100+d 溢出)抛错。
function mapBuildToSemver(buildVersion) {
  const raw = String(buildVersion == null ? '' : buildVersion).trim();
  const parts = raw.split('.');
  if (parts.length < 3 || parts.length > 4) {
    throw new Error('[version-map] buildVersion 须为三段或四段·得到: ' + JSON.stringify(raw));
  }
  const nums = parts.map(function (s) {
    if (!/^\d+$/.test(s)) throw new Error('[version-map] 段非纯数字: ' + JSON.stringify(raw));
    return parseInt(s, 10);
  });
  const a = nums[0], b = nums[1], c = nums[2], d = nums.length === 4 ? nums[3] : 0;
  if (d > 99) {
    throw new Error('[version-map] 第四段(热修号)须 0..99·得到 ' + d + ' (' + raw + ')·' +
      '否则 a.b.(c*100+d) 会与下一组 c 碰撞(如 1.3.4.100 撞 1.3.5.0)。请改用两位以内热修号或调整方案。');
  }
  return a + '.' + b + '.' + (c * 100 + d);
}

// 合法三段 semver 数字段(无前导零·非负整数)
function isStrictNumericSemver(v) {
  return /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/.test(String(v || ''));
}

// 合法四段展示版本(各段非负整数·第四段 0..99)
function isValidBuildVersion(bv) {
  const m = /^(\d+)\.(\d+)\.(\d+)\.(\d+)$/.exec(String(bv || ''));
  if (!m) return false;
  return parseInt(m[4], 10) <= 99;
}

module.exports = { mapBuildToSemver, isStrictNumericSemver, isValidBuildVersion };
