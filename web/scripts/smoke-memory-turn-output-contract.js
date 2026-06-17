#!/usr/bin/env node
'use strict';

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
const schemaSource = fs.readFileSync(path.join(ROOT, 'tm-ai-schema.js'), 'utf8');
const validatorSource = fs.readFileSync(path.join(ROOT, 'tm-ai-output-validator.js'), 'utf8');
const endturnSource = fs.readFileSync(path.join(ROOT, 'tm-endturn-ai.js'), 'utf8');

const sandbox = { window: {}, console };
sandbox.window = sandbox;
sandbox.globalThis = sandbox;
vm.createContext(sandbox);
vm.runInContext(schemaSource, sandbox, { filename: 'tm-ai-schema.js' });

assert(sandbox.TM_AI_SCHEMA, 'TM_AI_SCHEMA should be exported');
const known = sandbox.TM_AI_SCHEMA.toKnownFields('turn-full');
const required = sandbox.TM_AI_SCHEMA.toRequiredSubfields();

assert.strictEqual(known.character_memory_updates, 'array', 'schema should recognize character_memory_updates');
assert(required.character_memory_updates.includes('actor'), 'character memory schema requires actor');
assert(required.character_memory_updates.includes('memory'), 'character memory schema requires memory');
assert(required.character_memory_updates.includes('confidence'), 'character memory schema requires confidence');
assert(required.character_memory_updates.includes('source_refs'), 'character memory schema requires source_refs');

assert(validatorSource.includes('character_memory_updates'), 'validator fallback should recognize character_memory_updates');
assert(endturnSource.includes('character_memory_updates'), 'SC1 prompt should describe character_memory_updates');
assert(endturnSource.includes('memory_type'), 'SC1 prompt should require memory_type');
assert(endturnSource.includes('source_refs'), 'SC1 prompt should require source_refs');
assert(endturnSource.includes('confidence'), 'SC1 prompt should require confidence');
assert(endturnSource.includes('character_memory_updates: { type:') || endturnSource.includes('character_memory_updates: {'), 'strict SC1 json schema should include character_memory_updates');

console.log('smoke-memory-turn-output-contract ok');
