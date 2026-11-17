import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

// Applicability review: docs/dependency-security.md. Never a blanket severity waiver.
const advisoryUrl = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const expires = Date.parse('2026-11-25T00:00:00Z');
const reviewedLock = '5cf7b00fc27f925af0b765c6ecfaab22487a566de1ef624dd767fbedc25f42af';

export function reviewAudit(audit, { now = new Date(), lockMatches = false } = {}) {
  if (audit?.error || audit?.auditReportVersion !== 2 ||
      !audit.vulnerabilities || Array.isArray(audit.vulnerabilities) ||
      typeof audit.vulnerabilities !== 'object' ||
      audit.metadata?.vulnerabilities?.total !== Object.keys(audit.vulnerabilities).length) {
    throw new Error('Invalid or incomplete npm audit response');
  }
  const vulnerabilities = audit.vulnerabilities;
  const active = lockMatches && Number.isFinite(+now) && +now < expires;
  function reviewed(name, visited = new Set()) {
    const entry = vulnerabilities[name];
    if (!active || visited.has(name) || !Array.isArray(entry?.via) || !entry.via.length) return false;
    const next = new Set([...visited, name]);
    return entry.via.every((via) => {
      if (typeof via === 'string') return reviewed(via, next);
      return name === 'picomatch' && via?.name === 'picomatch' && via.dependency === 'picomatch' &&
        via.url === advisoryUrl && via.range === '<=4.0.7' && via.severity === 'high';
    });
  }
  const accepted = [], blocking = [];
  for (const name of Object.keys(vulnerabilities)) (reviewed(name) ? accepted : blocking).push(name);
  return { accepted, blocking };
}

export function evaluateResult(result, options) {
  if (result.error || ![0, 1].includes(result.status)) throw new Error('npm audit command failed');
  const audit = JSON.parse(result.stdout);
  const review = reviewAudit(audit, options);
  const count = Object.keys(audit.vulnerabilities).length;
  if ((result.status === 0) !== (count === 0)) throw new Error('Inconsistent npm audit exit status');
  return review;
}

function main() {
  const result = spawnSync('npm', ['audit', '--json'], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', timeout: 120000, maxBuffer: 8e6 });
  // Save the unmodified report even when review fails, for incident diagnosis.
  if (process.argv[2]) writeFileSync(process.argv[2], result.stdout || '');
  const lock = readFileSync(new URL('../package-lock.json', import.meta.url));
  const review = evaluateResult(result, {
    lockMatches: createHash('sha256').update(lock).digest('hex') === reviewedLock,
  });
  if (review.accepted.length) {
    console.warn(`Temporary applicability exception: ${advisoryUrl}; expires 2026-11-25 UTC; affected packages: ${review.accepted.join(', ')}`);
  }
  if (review.blocking.length) throw new Error(`Blocking audit findings: ${review.blocking.join(', ')}`);
  console.log('Dependency audit policy passed');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
