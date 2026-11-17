const { test } = require('node:test');
const assert = require('node:assert/strict');

const load = () => import('../tools/dependency-audit.mjs');
const advisory = {
  name: 'picomatch', dependency: 'picomatch', range: '<=4.0.7', severity: 'high',
  url: 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf',
};
const report = () => ({ auditReportVersion: 2, metadata: { vulnerabilities: { total: 2 } }, vulnerabilities: {
  picomatch: { via: [{ ...advisory }] }, astro: { via: ['picomatch'] },
} });
const options = { now: new Date('2026-11-18T00:00:00Z'), lockMatches: true };

test('review permits only the unpatched advisory and its transitive effects', async () => {
  const { reviewAudit } = await load();
  assert.deepEqual(reviewAudit(report(), options), { accepted: ['picomatch', 'astro'], blocking: [] });
});

test('new advisories and mixed transitive chains still block publication', async () => {
  const { reviewAudit } = await load();
  const audit = report();
  audit.vulnerabilities.picomatch.via.push({ ...advisory, url: 'https://github.com/advisories/GHSA-new' });
  assert.deepEqual(reviewAudit(audit, options).blocking, ['picomatch', 'astro']);
});

test('changed dependencies or expired review cannot use the exception', async () => {
  const { reviewAudit } = await load();
  assert.equal(reviewAudit(report(), { ...options, lockMatches: false }).blocking.length, 2);
  assert.equal(reviewAudit(report(), { ...options, now: new Date('2026-11-25T00:00:00Z') }).blocking.length, 2);
});

test('missing references, cycles and malformed audit results fail closed', async () => {
  const { reviewAudit } = await load();
  for (const via of [['missing'], ['astro'], []]) {
    const audit = report();
    audit.vulnerabilities.picomatch.via = via;
    assert.equal(reviewAudit(audit, options).blocking.length, 2);
  }
  for (const audit of [{}, { error: { code: 'ECONNRESET' } }, { ...report(), auditReportVersion: 3 }]) {
    assert.throws(() => reviewAudit(audit, options));
  }
});

test('clean audit passes even after review expires', async () => {
  const { reviewAudit } = await load();
  const audit = { auditReportVersion: 2, metadata: { vulnerabilities: { total: 0 } }, vulnerabilities: {} };
  assert.deepEqual(reviewAudit(audit, { ...options, lockMatches: false }).blocking, []);
});

test('registry errors, malformed JSON and inconsistent npm exit statuses block', async () => {
  const { evaluateResult } = await load();
  for (const result of [
    { status: 1, stdout: '{' },
    { status: 1, stdout: '{"error":{"code":"ENETUNREACH"}}' },
    { status: 2, stdout: JSON.stringify(report()) },
    { status: null, error: new Error('timeout') },
    { status: 0, stdout: JSON.stringify(report()) },
  ]) assert.throws(() => evaluateResult(result, options));
  assert.equal(evaluateResult({ status: 1, stdout: JSON.stringify(report()) }, options).blocking.length, 0);
});
