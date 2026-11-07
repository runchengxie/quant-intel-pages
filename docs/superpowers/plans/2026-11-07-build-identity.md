# Pages Build Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans task by task. This record describes the approved isolated development scope; it does not authorize deployment.

**Goal:** Bind formal build artifacts to observed source, generator, inputs and quality evidence.

**Architecture:** External identity plus independent upload verifier; frozen original inputs and exported snapshot are distinct from final output. Preserve both receipts in the existing ledger.

**Tech Stack:** Python standard library/pytest, existing Node/Astro and Actions.

**Spec:** [Completed website build identity](../specs/2026-11-07-build-identity.md).

## Global constraints

Use `market_intel_pages.build_identity.v1`; reference existing `market_intel.report_quality.v1`. Keep receipts private and outside website output. Require clean source and immutable installed VCS exporter for formal mode; ordinary builder callers remain compatible. No production, hooks, credentials or historical identity rewriting.

## Review focus

Input additions/removals during render; identity finalization/rollback failure; symlink and overlapping paths; launcher provenance differing from installed metadata; stale quality or browser-fixture evidence used for formal output.

### Task 1: Identity checks and verifier

Files: `scripts/build_identity.py`, `tests/test_build_identity.py`.

- [x] Write failing tests for safe hashing, quality snapshot matching, installed exporter provenance and independent output verification.
- [x] Implement `FileRecord`, `IdentityOptions`, `hash_tree`, `validate_quality`, `exporter_provenance`, `verify_identity` and verification CLI.
- [x] Require immutable VCS metadata and verify launcher against installed distribution RECORD; avoid exporting credential-bearing URLs.
- [x] Run targeted tests, Ruff/type checks; commit.

### Task 2: Frozen input and recoverable promotion

Files: `scripts/build_site.py`, `tests/test_build_site.py`, `tests/test_build_identity_integration.py`.

- [x] Watch formal identity, mutation, stale evidence and finalization failure tests fail.
- [x] Add optional `IdentityOptions` and four required-together CLI options, freeze original public inputs and overrides, preserve separate exported snapshot/rendered tree.
- [x] Recheck original/snapshot/source evidence, stage external identity and exclusively publish it after output promotion; restore previous output or retain recovery material on rollback failure.
- [x] Run builder and full Python tests; commit.

### Task 3: Workflow upload gate and ledger

Files: `.github/workflows/public-site.yml`, `tests/test_build_identity_workflow.py`.

- [x] Execute a failing workflow-gate behavior test before adding the gate.
- [x] Retain locked exporter dependencies and reinstall only the project from the immutable pinned VCS commit for observed provenance.
- [x] Generate identity with run/attempt task ID, verify before uploads, preserve both receipts in existing ledger without exposing them publicly.
- [x] Execute workflow shell gate against matching/corrupt output and verify existing ledger hashing compatibility; commit.

### Task 4: Documentation and whole-branch checks

Files: `docs/daily-generation-options.md`, matching Chinese document, this plan and its spec.

- [x] Document local opt-in, actual provenance and build-vs-publication distinction, ledger retention and historical unknowns.
- [x] Run all checks required in AGENTS, including >=85% Python branch coverage, real pinned-exporter build and browser checks with isolated output/port.
- [x] Record exact source/producer revisions and results; request fresh branch review. Address the three Important review findings in one regression-tested fix pass; repeat affected checks before handoff. No push/merge/deploy in the implementation handoff.

## Implementation rulings

Freeze original inputs before invoking exporter, rather than only freezing its output. Replace the old substring-based import prohibition with an AST import boundary check because schema names are legitimate strings. Test upload gate by running its shell commands rather than comparing workflow source text. Inspect installed launcher RECORD as well as immutable distribution commit: matching metadata alone would accept a replaced launcher. Preserve the existing ledger artifact suffix for consumer compatibility while recording true attempt in task identity.

Review fixes preserve validated snapshot bytes in final output and verify that relationship independently; reject summaries overrides within replaced output; execute the exporter with the same isolated interpreter as its provenance probe and verify owner package RECORD/import origins before and after building. The build remains an observed provenance record, not protection against hostile administrators, mutate-and-restore races or filesystem/power failure.
