#!/usr/bin/env node
// Compatibility entrypoint: all official-scenario products are generated together.
'use strict';
const syncer = require('./sync-official-scenarios.js');
function build() { return syncer.sync({ check: false }); }
if (require.main === module) build();
module.exports = { ENTRIES: syncer.ENTRIES, build };
