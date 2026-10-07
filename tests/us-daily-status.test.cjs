const { test } = require('node:test');
const assert = require('node:assert/strict');
const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const path = require('node:path');

test('producer status is bound to public run, date and content identity', async () => {
  const root = mkdtempSync(path.join(tmpdir(), 'us-status-'));
  const previous = process.env.ASTRO_DATA_ROOT;
  const report = { run_id: 'daily-2026-10-06', publication: 'public', content_hash: 'a'.repeat(64) };
  const row = { ...report, date: '2026-10-06', report_status: { market: 'complete', research: 'not_included', publication: 'published' }, missing_market_facts: [] };
  const unknown = { market: 'unknown', research: 'unknown', publication: 'unknown' };
  try {
    mkdirSync(path.join(root, 'data'));
    process.env.ASTRO_DATA_ROOT = root;
    const { loadUsDailyStatus } = await import('../src/lib/reports.ts');
    const write = (rows) => writeFileSync(path.join(root, 'data/us_daily_status.json'), JSON.stringify({ schema_version: 'market_intel_pages.us_daily_status.v1', reports: rows }));
    assert.deepEqual(loadUsDailyStatus(report), unknown);
    write([row]);
    assert.deepEqual(loadUsDailyStatus(report), row.report_status);
    const incomplete = { market: 'incomplete', research: 'reviewed', publication: 'published' };
    write([{ ...row, report_status: incomplete, missing_market_facts: ['index.spx.change_percent'] }]);
    assert.deepEqual(loadUsDailyStatus(report), incomplete);
    for (const change of [{ content_hash: 'b'.repeat(64) }, { run_id: 'daily-2026-10-05' }, { date: '2026-10-05' }, { report_status: { ...row.report_status, research: 'pending_review' } }]) {
      write([{ ...row, ...change }]);
      assert.deepEqual(loadUsDailyStatus(report), unknown);
    }
    write([row, row]);
    assert.deepEqual(loadUsDailyStatus(report), unknown);
    write([row]);
    assert.deepEqual(loadUsDailyStatus({ ...report, publication: 'private' }), unknown);
  } finally {
    if (previous === undefined) delete process.env.ASTRO_DATA_ROOT;
    else process.env.ASTRO_DATA_ROOT = previous;
    rmSync(root, { recursive: true });
  }
});
