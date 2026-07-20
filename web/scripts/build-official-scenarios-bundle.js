#!/usr/bin/env node
// Compatibility entrypoint: preview, seeder, builtin, runtime and bundled copies
// must move atomically from the same root JSON sources.
'use strict';
const syncer = require('./sync-official-scenarios.js');
function build() { return syncer.sync({ check: false }); }
if (require.main === module) build();
module.exports = { build };
