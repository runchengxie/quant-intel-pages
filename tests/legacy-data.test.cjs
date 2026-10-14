const { test } = require('node:test');
const assert = require('node:assert/strict');
const { reports, summaries, insights, outcomes, health } = require('../src/legacy-source/app-data.ts');

test('legacy JSON boundary keeps usable reports while excluding invalid rows and sections', () => {
  const result = reports([null, { id: 42 }, { id: 'a', date: '2026-10-13', kind: 'morning', title: '<img>', summary: 'literal', source_url: 'reports/a.md', sections: [null, { title: 'Data', paragraphs: ['safe', 123] }] }]);
  assert.equal(result.length, 1);
  assert.equal(result[0].title, '<img>');
  assert.equal(result[0].source_url, 'reports/a.md');
  assert.deepEqual(result[0].sections, [{ title: 'Data', paragraphs: ['safe'] }]);
  assert.deepEqual(summaries([{ date: '2026-10-13', text: 'unpaired' }]), []);
});

test('legacy insight boundary preserves source identity and evidence references', () => {
  const note = { id: 'insight-a', date: '2026-10-13', morning_report_id: 'a', evening_report_id: 'b', source_report_ids: ['a', 'b'], content_hash: 'producer-hash', generation_mode: 'retrospective', analysis: { overview: { text: 'Claim', evidence_ids: ['e1'] }, changes: [], tensions: [], watchpoints: [] }, evidence: [{ id: 'e1', report_id: 'a', section: 'Data', text: '<b>Literal</b>' }], metrics: {}, quality_warnings: [] };
  const result = insights([null, {}, note]);
  assert.equal(result.length, 1);
  assert.equal(result[0].content_hash, note.content_hash);
  assert.deepEqual(result[0].source_report_ids, note.source_report_ids);
  assert.deepEqual(result[0].evidence, note.evidence);
  assert.deepEqual(result[0].analysis.overview.evidence_ids, ['e1']);
});

test('legacy outcomes retain optional evidence ids and ignore unsupported statuses', () => {
  const result = outcomes({ outcomes: [{ insight_id: 'i', watchpoint_index: 0, status: 'met', evidence_ids: ['e', 123], evidence: [{ id: 'e', report_id: 'r', section: 'Data', text: 'Observed' }] }, { insight_id: 'i', watchpoint_index: 1, status: 'unknown' }] });
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].evidence_ids, ['e']);
  assert.equal(result[0].evidence[0].id, 'e');
});

test('legacy health rejects absent limits and preserves producer freshness flags', () => {
  assert.equal(health(null), null);
  assert.equal(health({ max_age_hours: '48' }), null);
  const result = health({ status: 'stale', max_age_hours: 48, expected_date: '2026-10-13', pair_available: false });
  assert.equal(result.status, 'stale');
  assert.equal(result.expected_date, '2026-10-13');
  assert.equal(result.pair_available, false);
});
