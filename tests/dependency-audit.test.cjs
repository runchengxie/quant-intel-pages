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
const options = { now: new Date('2026-11-18T00:00:00Z'), lockMatches: true, scopeMatches: true };

test('review permits only the unpatched advisory and its transitive effects', async () => {
  const { reviewAudit } = await load();
  assert.deepEqual(reviewAudit(report(), options), { accepted: ['picomatch', 'astro'], blocking: [], reviewDue: false });
});

test('new advisories and mixed transitive chains still block publication', async () => {
  const { reviewAudit } = await load();
  const audit = report();
  audit.vulnerabilities.picomatch.via.push({ ...advisory, url: 'https://github.com/advisories/GHSA-new' });
  assert.deepEqual(reviewAudit(audit, options).blocking, ['picomatch', 'astro']);
});

test('changed dependency or application scope invalidates applicability immediately', async () => {
  const { reviewAudit } = await load();
  assert.equal(reviewAudit(report(), { ...options, lockMatches: false }).blocking.length, 2);
  assert.equal(reviewAudit(report(), { ...options, scopeMatches: false }).blocking.length, 2);
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


test('overdue maintenance remains observable without expiring unchanged applicability', async () => {
  const { reviewAudit } = await load();
  const review = reviewAudit(report(), { ...options, now: new Date('2026-11-26T00:00:00Z') });
  assert.deepEqual(review.blocking, []);
  assert.equal(review.reviewDue, true);
  assert.throws(() => reviewAudit(report(), { ...options, now: new Date('invalid') }));
});

test('scope binding detects source, build configuration and new files but ignores report data and docs', async () => {
  const { scopeDigest } = await load();
  const { mkdtempSync, mkdirSync, writeFileSync, rmSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const { join } = require('node:path');
  const root = mkdtempSync(join(tmpdir(), 'applicability-'));
  try {
    for (const path of ['src', 'docs', 'artifacts', 'tools', '.github']) mkdirSync(join(root, path));
    writeFileSync(join(root, 'src/app.js'), 'trusted patterns');
    const initial = scopeDigest(root);
    writeFileSync(join(root, 'docs/report.md'), 'new documentation');
    writeFileSync(join(root, 'artifacts/report.json'), 'new report');
    assert.equal(scopeDigest(root), initial);
    writeFileSync(join(root, 'src/app.js'), 'user supplied patterns');
    assert.notEqual(scopeDigest(root), initial);
    writeFileSync(join(root, 'src/app.js'), 'trusted patterns');
    writeFileSync(join(root, 'astro.config.mjs'), 'dynamic configuration');
    assert.notEqual(scopeDigest(root), initial);
    rmSync(join(root, 'astro.config.mjs'));
    writeFileSync(join(root, 'tools/new-build.mjs'), 'execute input');
    assert.notEqual(scopeDigest(root), initial);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('new root build configuration symlinks cannot escape applicability review', async () => {
  const { scopeDigest } = await load();
  const { mkdtempSync, writeFileSync, symlinkSync, rmSync } = require('node:fs');
  const { tmpdir } = require('node:os');
  const { join } = require('node:path');
  const root = mkdtempSync(join(tmpdir(), 'applicability-root-link-'));
  try {
    writeFileSync(join(root, 'source.md'), 'external build configuration');
    symlinkSync(join(root, 'source.md'), join(root, 'astro.config.mjs'));
    assert.throws(() => scopeDigest(root), /symlink/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});
