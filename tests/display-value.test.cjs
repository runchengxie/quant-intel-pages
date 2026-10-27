const test = require('node:test');
const assert = require('node:assert/strict');
test('display precision rounds standalone metrics without touching evidence or identifiers', async () => {
  const { formatDisplayValue: format } = await import('../src/lib/display-value.ts');
  for (const locale of ['zh', 'en']) {
    assert.equal(format('-0.6160616517055656%', locale), '-0.62%');
    assert.equal(format('+1.23456%', locale), '+1.23%');
    assert.equal(format('-0.0001%', locale), '0.00%');
    assert.equal(format('-0.005%', locale), '-0.01%');
    assert.equal(format('123.456 CNY 100m', locale), '123.46 CNY 100m');
    for (const source of ['000001', '2026-10-26', 'https://example.com/0.1234', 'Evidence 0.1234%', '1.20%', 'N/A']) assert.equal(format(source, locale), source);
  }
});
