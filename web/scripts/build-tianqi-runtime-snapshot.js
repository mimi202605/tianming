#!/usr/bin/env node
// Compatibility entrypoint. The former runtime snapshot was retired because
// it duplicated the complete official scenario; keep old automation working by
// forwarding to the one-way root-JSON generator.
'use strict';
require('./sync-official-scenarios.js').sync({ check: false });
