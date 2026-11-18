# Dependency security review

[简体中文](dependency-security.zh-CN.md)

Run `node tools/dependency-audit.mjs /tmp/npm-audit.json` for the same dependency gate as CI. It runs the full `npm audit --json` and retains the unmodified response. Findings without a matching applicability review, network errors, malformed responses and inconsistent exit statuses fail publication.

## Scoped applicability review: GHSA-fc5q-39xc-vjpf

Reviewed 2026-11-18; maintenance due **2026-11-25 00:00 UTC**. `tools/security-applicability.json` binds this exact advisory to the SHA-256 of `package-lock.json` and the complete reviewed application/build scope. Scope covers every file in `src/`, `scripts/`, `tools/`, `.github/`, `config/` and `public/` when present, plus root JSON, JS/TS, TOML, lock, YAML, HTML/CSS, shell and npm/runtime configuration files. New files and deletions change the digest. Only the binding record itself and generated Python/Astro caches are excluded. Links or special files fail closed. Documentation and `artifacts/` report data are outside the executable scope, so ordinary content updates do not invalidate applicability.

Any dependency, application or build/config change invalidates the review immediately; the audit blocks until a person or authorized agent reassesses the complete scope and explicitly records new hashes. The checker never refreshes its own binding. Do not update hashes merely to make CI green. These hashes establish integrity of the reviewed selection, not authentication of an approver.

The due date is a maintenance obligation: unchanged, still-inapplicable findings remain accepted with an explicit overdue warning. It is not an automatic revocation on an arbitrary date. Unknown findings, altered scope and unauditable results still fail. The accepted advisory and packages remain visible in console output and the uploaded unmodified audit response.

The [upstream advisory](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) covers picomatch through 4.0.7 and lists no patched version at review time. npm's 14 high findings in the incident are this advisory and its propagated dependency effects, not 14 independent advisories. Its exploit requires attacker-supplied repeated-extglob patterns such as `+(*a)`.

This repository produces static HTML. Picomatch is used by the trusted Astro/Vite tooling; repository application code does not import it or accept user-supplied glob expressions. `astro.config.mjs` is repository-owned, and report Markdown/JSON are data, not configuration or glob patterns. Publication uses fixed trusted commands and an installed, pinned snapshot exporter. Python filesystem globs are unrelated. There is no request-serving Node runtime in the deployed site. On this reviewed usage the advisory's attacker-controlled pattern prerequisite is absent. This is an applicability exception, **not a fix to picomatch**.

The checker accepts only this exact advisory URL, package, range and severity, including transitive effects whose entire `via` graph terminates in that finding. Other advisories on the same package, mixed chains, unresolved references and cycles remain blocking. No severity threshold is raised and no dependency class is omitted.

The independent `Dependency security review` workflow runs daily and can be dispatched manually. It performs the full npm audit and strict Python audit without publishing content, retains their raw reports, and reconciles a `[public-site-alert:security-review:main]` Issue through the existing alert client. Overdue maintenance, blocking findings, skipped/failed audits and missing/invalid evidence open or retain the Issue; only current complete successful evidence closes it. Audit process errors also fail the workflow. Source builds retain the same dependency gate; content builds retain their owner, identity, ledger and complete browser gates.

At each maintenance review check upstream patches and reassess the trusted-pattern assumption. If fixed, upgrade and validate dependencies. Otherwise document the fresh applicability analysis and review due date, inspect code/config changes, then update the explicit binding. Introducing dynamic glob configuration or executing untrusted build configuration invalidates this review immediately. Never broaden the advisory allowlist or omit dependency classes.

Browser provisioning caches Chromium by exact installed Playwright version, runner OS and architecture, without prefix fallback. Installation still runs on cache hits to verify availability and install OS dependencies. An eight-minute step and seven-minute command bound provisioning; both source and exact-output content browser suites remain required. No container registry is introduced.
