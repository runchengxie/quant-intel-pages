# Dependency security review

[简体中文](dependency-security.zh-CN.md)

Run `node tools/dependency-audit.mjs /tmp/npm-audit.json` for the same dependency gate as CI. It runs the full `npm audit --json` and retains the unmodified response. Findings without an active applicability review, network errors, malformed responses and inconsistent exit statuses fail publication.

## Temporary review: GHSA-fc5q-39xc-vjpf

Reviewed 2026-11-18; expires **2026-11-25 00:00 UTC**. The exception is bound to the exact SHA-256 of the reviewed `package-lock.json` in the checker. Any dependency change invalidates it. The accepted finding remains visible in console output and the uploaded raw audit report.

The [upstream advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) covers picomatch through 4.0.7 and lists no patched version at review time. npm's 14 high findings in the incident are this advisory and its propagated dependency effects, not 14 independent advisories. Its exploit requires attacker-supplied repeated-extglob patterns such as `+(*a)`.

This repository produces static HTML. Picomatch is used by the trusted Astro/Vite tooling; repository application code does not import it or accept user-supplied glob expressions. `astro.config.mjs` is repository-owned, and report Markdown/JSON are data, not configuration or glob patterns. Publication uses fixed trusted commands and an installed, pinned snapshot exporter. Python filesystem globs are unrelated. There is no request-serving Node runtime in the deployed site. On this reviewed usage the advisory's attacker-controlled pattern prerequisite is absent. This is an applicability exception, **not a fix to picomatch**.

The checker accepts only this exact advisory URL, package, range and severity, including transitive effects whose entire `via` graph terminates in that finding. Other advisories on the same package, mixed chains, unresolved references and cycles remain blocking. No severity threshold is raised and no dependency class is omitted.

Before expiry, check for a patched upstream release and update dependencies, lockfile and review together. If none exists, reassess the trusted-pattern assumption explicitly; do not automatically extend the date. Introducing dynamic glob configuration or executing untrusted build configuration invalidates this review immediately.
