#!/usr/bin/env node
// DEPRECATED compatibility entrypoint.
// 根 scenarios/*（官方）.json 已是唯一真源，禁止再由内置 JS 反向覆盖。
'use strict';
console.warn('[export-official-scenario] 已改为正向同步；官方 JSON 是唯一真源。');
require('./sync-official-scenarios.js').main(process.argv.slice(2));
