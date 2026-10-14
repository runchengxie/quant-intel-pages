const test = require('node:test');
const assert = require('node:assert/strict');

test('insight presentation keeps the published identity, claims and evidence', async () => {
  const { latestInsight } = await import('../src/lib/insights.ts');
  const payload = { insights: [{
    id: 'archived-insight', date: '2026-10-12', source_hash: 'source-hash',
    source_hashes: { '2026-10-12-evening': 'report-hash' },
    analysis: { overview: { text: 'Published observation', evidence_ids: ['e1'] },
      changes: [], tensions: [], watchpoints: [] },
    evidence: [{ id: 'e1', report_id: '2026-10-12-evening', section: 'breadth', text: 'Published fact' }],
    metrics: { breadth: { label: 'Breadth', unit: '%' } }, quality_warnings: [],
  }] };
  const expected = [...payload.insights].sort((a, b) => b.date.localeCompare(a.date))[0];
  const result = latestInsight(payload);
  for (const key of ['id', 'date', 'source_hashes', 'source_hash', 'analysis', 'evidence', 'metrics', 'quality_warnings']) {
    assert.deepEqual(result[key], expected[key]);
  }
});

test('optional malformed insight fields cannot crash templates or create evidence links', async () => {
  const { latestInsight, insightOutcomes } = await import('../src/lib/insights.ts');
  const payload = { insights: [{ date: '2026-10-12', analysis: { overview: { text: 'claim', evidence_ids: [] },
    changes: [null, { text: 'bad', evidence_ids: 1 }], watchpoints: [null] }, evidence: [null, { id: 'x' }],
    metrics: { x: null }, quality_warnings: {} }], outcomes: [null, { status: 'invented' }] };
  const result = latestInsight(payload);
  assert.equal(result.analysis.overview.text, 'claim');
  assert.deepEqual(result.analysis.changes, []);
  assert.deepEqual(result.analysis.watchpoints, []);
  assert.deepEqual(result.evidence, []);
  assert.deepEqual(result.metrics, {});
  assert.deepEqual(result.quality_warnings, []);
  assert.deepEqual(insightOutcomes(payload), []);
  assert.equal(latestInsight(null), null);
});

test('outcomes preserve source evidence without requiring an optional evidence ID', async () => {
  const { insightOutcomes } = await import('../src/lib/insights.ts');
  const row = { insight_id: 'x', watchpoint_index: 0, status: 'met', observed_value: 2,
    evidence: [{ report_id: '2026-10-12-evening', section: 'breadth', text: '2' }] };
  assert.deepEqual(insightOutcomes({ outcomes: [row] }), [row]);
});

// Empty insight history is a supported fact-only publication, regardless of provider state.
test('disabled or unavailable interpretation does not require an insight record', async () => {
  const { latestInsight, insightOutcomes } = await import('../src/lib/insights.ts');
  for (const status of ['disabled', 'unavailable', 'not_configured']) {
    const payload = { schema_version: 'market_intel_pages.insights.v1', generation: { status }, insights: [], outcomes: [] };
    assert.equal(latestInsight(payload), null);
    assert.deepEqual(insightOutcomes(payload), []);
  }
});
