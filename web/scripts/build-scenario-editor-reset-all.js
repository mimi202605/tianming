#!/usr/bin/env node
// Compatibility entrypoint: editor data is generated with every other official
// scenario consumer so a partial refresh cannot create split-brain state.
'use strict';
const syncer = require('./sync-official-scenarios.js');
function main() { return syncer.sync({ check: false }); }
if (require.main === module) main();
module.exports = { main };
