import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync, readdirSync, lstatSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve, relative } from 'node:path';

// Applicability review: docs/dependency-security.md. Never a blanket severity waiver.
const advisoryUrl = 'https://github.com/advisories/GHSA-fc5q-39xc-vjpf';
const reviewDueAt = Date.parse('2026-11-25T00:00:00Z');
const root = fileURLToPath(new URL('..', import.meta.url));
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');

// Complete application/build/config inventory, not report bytes or human prose.
// New root configuration files are included automatically; links fail closed.
export function scopeDigest(directory) {
  const files = [];
  function visit(path) {
    const name = relative(directory, path).replaceAll('\\', '/');
    if (name === 'tools/security-applicability.json' || /(^|\/)(__pycache__|\.astro)(\/|$)/.test(name) || name.endsWith('.pyc')) return;
    const stat = lstatSync(path);
    if (stat.isSymbolicLink()) throw new Error('Applicability scope contains a symlink');
    if (stat.isDirectory()) {
      for (const entry of readdirSync(path).sort()) visit(resolve(path, entry));
    } else if (stat.isFile()) files.push([name, hash(readFileSync(path))]);
    else throw new Error('Applicability scope contains a special file');
  }
  for (const entry of readdirSync(directory).sort()) {
    const path = resolve(directory, entry);
    if (['src', 'scripts', 'tools', '.github', 'config', 'public'].includes(entry) ||
        (/\.(json|mjs|cjs|js|ts|toml|lock|ya?ml|html|css|sh)$/.test(entry) || /^\.(npmrc|node-version|python-version)$/.test(entry))) visit(path);
  }
  return hash(JSON.stringify(files.sort((a, b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0)));
}

export function reviewAudit(audit, { now = new Date(), lockMatches = false, scopeMatches = false } = {}) {
  if (!Number.isFinite(+now)) throw new Error('Invalid review time');
  if (audit?.error || audit?.auditReportVersion !== 2 ||
      !audit.vulnerabilities || Array.isArray(audit.vulnerabilities) ||
      typeof audit.vulnerabilities !== 'object' ||
      audit.metadata?.vulnerabilities?.total !== Object.keys(audit.vulnerabilities).length) {
    throw new Error('Invalid or incomplete npm audit response');
  }
  const vulnerabilities = audit.vulnerabilities;
  const active = lockMatches && scopeMatches;
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
  return { accepted, blocking, reviewDue: accepted.length > 0 && +now >= reviewDueAt };
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
  const statusPath = process.argv[3];
  if (statusPath) writeFileSync(statusPath, JSON.stringify({ state: 'unknown', blocking: [] }) + '\n');
  const result = spawnSync('npm', ['audit', '--json'], { cwd: fileURLToPath(new URL('..', import.meta.url)), encoding: 'utf8', timeout: 120000, maxBuffer: 8e6 });
  // Save the unmodified report even when review fails, for incident diagnosis.
  if (process.argv[2]) writeFileSync(process.argv[2], result.stdout || '');
  const binding = JSON.parse(readFileSync(resolve(root, 'tools/security-applicability.json'), 'utf8'));
  if (binding.schema !== 'dependency-applicability.v1' || binding.advisory !== advisoryUrl ||
      !/^[a-f0-9]{64}$/.test(binding.lock_sha256) || !/^[a-f0-9]{64}$/.test(binding.scope_sha256)) throw new Error('Invalid applicability binding');
  const lock = readFileSync(new URL('../package-lock.json', import.meta.url));
  const review = evaluateResult(result, {
    lockMatches: hash(lock) === binding.lock_sha256,
    scopeMatches: scopeDigest(root) === binding.scope_sha256,
  });
  if (statusPath) writeFileSync(statusPath, JSON.stringify({ state: review.blocking.length ? 'blocking' : review.reviewDue ? 'overdue' : 'current', ...review }) + '\n');
  if (review.accepted.length) {
    console.warn(`Reviewed applicability: ${advisoryUrl}; maintenance ${review.reviewDue ? 'OVERDUE' : 'due 2026-11-25 UTC'}; affected packages: ${review.accepted.join(', ')}`);
    if (review.reviewDue) console.warn('::warning::Dependency applicability maintenance overdue; reassess upstream and recorded usage scope');
  }
  if (review.blocking.length) throw new Error(`Blocking audit findings: ${review.blocking.join(', ')}`);
  console.log('Dependency audit policy passed');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try { main(); } catch (error) { console.error(error.message); process.exitCode = 1; }
}
