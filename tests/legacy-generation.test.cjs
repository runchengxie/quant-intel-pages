const { test } = require('node:test');
const assert = require('node:assert/strict');
const { readFileSync } = require('node:fs');

test('legacy controller is generated from the typed source', () => {
  const generator = readFileSync('tools/generate-legacy.ts', 'utf8');
  assert.ok(generator.includes('src/legacy-source/app.ts'));
  assert.ok(readFileSync('src/legacy/app.js', 'utf8').startsWith('// Generated from TypeScript'));
});
