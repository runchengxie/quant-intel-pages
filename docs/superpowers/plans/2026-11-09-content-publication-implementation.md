# Report Content Publication Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development, one fresh implementer and an independent spec/quality review per task. The owner explicitly requested implementation of the discussed flow. Preserve the established execution method and standing integration authorization; do not ask again for a generic method or approach choice.

**Goal:** Publish validated daily/weekly website content without periodic report commits, preserving independent owners, recoverable publication and existing URLs.
**Architecture:** Platform packages and validates public snapshots; Pages renders verified external inputs and provides one opt-in production workflow; Deploy coordinates complete snapshots, immutable assets, live verification and archives across all families.
**Tech Stack:** Existing Python 3.11–3.13 owner package, standard-library ZIP/hash codecs, Astro/TypeScript/Playwright, GitHub Release assets and Actions Pages deployment, existing Deploy CLIs/state/locks.
**Spec:** [English design](../specs/2026-11-09-content-publication-design.md) · [中文设计](../specs/2026-11-09-content-publication-design.zh-CN.md), reviewed for builder readiness at design commit 0362868. Owner implementation request precedes this execution record.

## Global Constraints

- Keep Astro and GitHub Pages.
- Code changes retain reviewed PRs and full source quality gates.
- Content changes retain owner validation, rendering, publication receipts, permanent private archives, and online date/hash verification.
- Platform owns generation, public projection, report contracts and the installed snapshot CLI.
- Pages owns Astro, its quality validator, static downloads and Pages workflows.
- Deploy calls installed pinned owner CLIs, never sibling Python sources.
- Merge Platform's provider first, Pages' consumer second, then Deploy's consumer.
- A package contains a canonical manifest and only the Platform-exported data/ and reports/ payload.
- It never contains source code, private raw inputs, credentials, build caches or executable workflow files.
- Legacy source-input builds retain their existing identity schema and behavior.
- Code source and report inputs must not be conflated.
- Do not put a bundle digest in legacy merge_sha or invent a commit.
- Content mode therefore has one explicit production workflow and one shared publication coordinator.
- In content mode, source PR/push workflows run full source checks and previews but do not independently deploy committed report inputs.
- Asia, U.S. and weekly publishers use one configured content state root and one cross-process repository-level lock in content mode.
- Existing report freshness monitoring remains Deploy-owned.
- No historical report/Git history/receipt is rewritten or deleted.
- Existing production files/timers/current links, repository mode variable and live publication require separate authorization under repository instructions.
- Development tests never send messages.

## Review Focus

1. A package can have correct hashes but contain private/unknown fields: public projection must precede upload and both consumers validate eligibility (Task 1).
2. A renderer update or interleaved family update can erase newer reports: only one production path, shared complete parent snapshot and source-only preservation (Tasks 3–5).
3. Deployment may succeed before a response or local admission is saved: reconcile actual asset/run/live identity, retain pending state and never bootstrap stale Git inputs (Tasks 4–6).
4. External input can invalidate a clean-source provenance receipt or overwrite prior output: isolate roots, preserve v1, bind v2 to actual input/producer/renderer bytes and rollback (Task 2).
5. A legacy pending run or rollback can overwrite new content: explicit mode preflight, drain checks, preserved old receipts and a verified recovery snapshot rather than stale inputs (Task 6).

## Execution and validation

P=quant-intel-platform; W=quant-intel-pages; D=quant-intel-deploy. Initial fetched clean bases: P357613b2efa30446ee05bc9acf47c981b6ddef4f; W8c584da7e463aabeab4d21eb0a7ffe19e7ceed93; De00e1bee3748e6111642806e2a8548526585ac58. Re-fetch at integration and validate the current combined result. Preserve production/other worktrees.

Each repository gets its own task branch/worktree under CODE_ROOT/.worktrees and its own outputs under DATA_ROOT/quant/<repo>/tasks/content-publication-20261109. Resolve roots from machine settings. Put environments, caches, builds, coverage, browser profiles, servers and receipts outside source and /tmp. No new shared latest pointers or production databases. CI Node tooling may need a task-local source-side node_modules under its existing contract; preserve only that normal ignored dependency directory and keep retained results external.

Controller owns remote writes and provider-first integration. Inspect push URL/account/outgoing commits; public noreply identity, no force/hooks bypass. Task reviews use recorded BASE..HEAD packages. Whole-branch review precedes each owner merge. No separate human PR review is required by standing authorization; enforced repository controls still apply.

P gates: locked sync, Ruff check/format, ty, full pytest/contract checks, CLI help regeneration check and project_tools/check_all.py --scope all; installed immutable-VCS CLI acceptance from an external working directory. W gates: all AGENTS Python lint/format/types/vulture/coverage>=85%, Node tests/checks, dependency audits, source and synthetic external-content builds, structure audit, complete existing browser suite and real isolated external-content browser checks, sequential builds. D gates: scripts/dev/check_local.sh and documented smoke coverage>=80%, Ruff/format/ty/maintainability/boundary/shellcheck/audit; no private Actions merely to obtain a green status. Follow actual per-repository locked versions and hooks.

Every task has meaningful RED/GREEN, paired EN/ZH reader docs and current capability limits. No full passed-suite repetitions without source changes or concrete unanswered doubts. A skip is not successful installed/browser acceptance. Source merge and legacy automatic site deployment are separate from activating the new production mode.

## Task 1: Platform public content package and installed CLI provider

**Files:** Create P/src/market_intel_publication/site_content_{contract,codec,validation,cli}.py, P/schemas/public/site_content_bundle.v1.schema.json, P/tests/test_site_content_bundle.py and P/docs/publication/site-content-bundles{,.zh-CN}.md. Modify P/pyproject.toml CLI entries, CLI help inventory and relevant existing public projection helpers/export_site_snapshot.py only when required to reuse a real eligibility boundary; update README/doc navigation. Preserve current numerical dependencies/package namespace; identify actual source by immutable revision/hash rather than version alone.

**Interfaces:** Frozen ContentBundleReceipt with schema_version=market_intel.site_content_receipt.v1, bundle_id, archive_sha256, producer_revision, created_at_utc and ordered file records. Each file record has path, sha256 and bytes. pack_site_content(root: Path, output: Path, *, created_at_utc: str, producer_revision: str) -> ContentBundleReceipt. verify_site_content(bundle: Path, expected_sha256: str, output: Path, *, expected_producer_revision: str) -> ContentBundleReceipt. CLI market-pack-site-content --root DIR --output ZIP --created-at UTC --producer-revision SHA --receipt JSON; market-verify-site-content --bundle ZIP --sha256 SHA --output DIR --expected-producer-revision SHA --receipt JSON. JSON receipts are external and do not grant publication by themselves.

Manifest exact fields: schema_version=market_intel.site_content_bundle.v1, publication=public, bundle_id, created_at_utc, producer and files. Producer has owner=quant-intel-platform, distribution=market-intel, source_revision and source_sha256 measured from the installed producer closure. Files sorted by path; logical bundle_id is SHA256 of canonical UTF-8 sorted compact JSON manifest excluding bundle_id. ZIP manifest.json plus payload/<path>; fixed entry timestamps/modes and stable compression settings. Actual archive digest is independent. Creation time is supplied once and reused, not regenerated during retries.

Limit archive64MiB, expanded256MiB, single file16MiB, file count4096, manifest2MiB. New output only or atomic replacement of an explicitly owned prior output with rollback; never overwrite input/archive/receipt. Materialized output contains artifacts/public/data and reports for the existing exporter. Only fixed exported public file families are permitted. Unknown producer provenance fails formal packaging; do not fabricate a Git SHA from caller input or editable metadata.

- [ ] Add test_deterministic_bundle_roundtrip_all_families: identical inputs/time/producer yield identical archive bytes; output files match bytes; all supported Asia/U.S./weekly content and five-date windows survive re-export.
- [ ] Add tests rejecting private/unknown public fields, unindexed extra files, missing public markers, changed source/digest/size, duplicate JSON/ZIP names, traversal/backslash/drive/link/device members, unknown keys, limit overflows and input/output overlap. Assert no partial output/receipt promotion.
- [ ] Run focused tests RED for missing owner codec, not a missing test dependency.
- [ ] Implement using existing export/projection/contract functions. Where existing snapshot copying does not enforce eligibility, add a reusable owner-side public-snapshot validator. Do not copy projection logic into consumers or silently strip private fields after upload. Retain all historical legacy allowlists and source-hash meanings.
- [ ] Validate installed committed-VCS CLI outside repositories, full P gates, paired docs and synthetic examples. Record actual source and archive/receipt hashes.
- [ ] Commit, independent task/whole-P review, merge provider and verify merged installed CLI. Record merged SHA as P_CONTENT_REV before Task 2 or D source changes.

## Task 2: Pages external inputs and additive build identity

**Files:** Modify W/scripts/build_site.py, build_identity.py and existing split identity helpers/tests; add W/tests/test_external_content_build.py, W/docs/content-publication{,.zh-CN}.md; update W/docs/daily-generation-options{,.zh-CN}.md and relevant navigation. Pin the installed Platform exporter/provider to actual merged P_CONTENT_REV in build workflows before using the new CLI.

**Interfaces:** Extend build_site(root,output,summaries_path=None,*,identity_options=None,public_inputs:Path|None=None,content_receipt:Path|None=None). Add --public-inputs DIR --content-receipt JSON CLI options. External mode requires formal identity and the matching verified receipt; reject summaries override in external mode. Old calls remain unchanged. Input directory is a new external staging root containing artifacts/public. New external builds use market_intel_pages.build_identity.v2; v1 remains strict and readable. v2 adds content fields bundle_id/archive_sha256/producer_revision and records source root, original public inputs and normalized exported snapshot separately. Do not relabel a content digest as source revision.

- [ ] Add tests proving external input selection, no fallback to stale repo data, source cleanliness and observed command/provenance, paired input/receipt requirement, wrong producer/hash rejection, input mutation detection, root/symlink/receipt/output overlap rejection and failed promotion preserving old output.
- [ ] Add v1 unchanged/golden verification and v2 strict field/hash checks; preserve isolated installed exporter and exact served-download checks. RED then minimum implementation.
- [ ] Build a real synthetic all-family bundle with the merged installed CLI and use it for a formal external render. Execute EN/ZH/date/download checks and record code/producer/input/output/quality identities.
- [ ] Run affected/full W checks; commit and independent task review before Task 3.

## Task 3: One opt-in workflow, shared build machinery and browser acceptance

**Files:** Refactor W/.github/workflows/public-site.yml to shared .github/workflows/site-build.yml using workflow_call; add .github/workflows/publish-content.yml; update public-site-monitor.yml, W/scripts/content_asset.py, W/scripts/content_publication_marker.py, corresponding Python/workflow tests, W/tests/browser/content-publication.spec.ts and browser server configuration as needed. Update EN/ZH setup/publication docs and README.

**Interfaces:** Repository variable CONTENT_PUBLICATION_MODE is unset/legacy by default; artifact-v1 opts in. Unknown nonempty values fail validation. In artifact-v1, public-site source PR/push builds/checks previews but has no production deployment. publish-content workflow_dispatch requires candidate_id, content_asset_id, content_sha256, producer_revision, renderer_revision and expected_parent_publication_id. Fixed owner/repository API, bounded asset download, no arbitrary URL/commands. renderer_revision must equal the actual main head selected for this workflow_dispatch run (github.sha) and be a reviewed green merged revision; reject mismatches before executing owner code. A main advance before dispatch is reconciled into a new renderer candidate, not an arbitrary checkout. Standard deployment keeps protected github-pages environment.

Shared build workflow has source/full and content profiles. Source profile keeps complete existing checks; content profile validates the bundle with the pinned installed provider, builds external inputs and runs quality/page smoke checks. Source CI also exercises the synthetic content profile without deploying. No verbatim duplicate pipeline or disabled required source gate. Production workflows share quant-intel-pages-production concurrency, cancel-in-progress=false. Pending replacement is recoverable by D; do not assume FIFO.

Publication marker schema market_intel_pages.site_publication.v1 at data/site-publication.json has publication_id=candidate_id, bundle_id, archive_sha256, producer_revision, renderer_revision, workflow_run_id and workflow_run_attempt. Trusted workflow context supplies run fields. Add the marker to staging after report quality checks and before final output hashing/identity promotion; bundle inputs cannot supply or replace this Pages-owned marker. Extend build_site with an optional trusted --publication-context JSON file in this task, preserving Task 2 calls. Persist original content plus marker/output hashes in the existing publication ledger family; no private details/public identity JSON. The workflow checks expected parent, with explicit bootstrap sentinel only for a validated first deployment, and treats an already matching candidate idempotently.

- [ ] RED tests for legacy defaults, invalid mode, artifact source-push no deploy, merged-ref restriction, fixed asset repository, exact byte/hash/size checks, wrong parent, marker/run mismatch and ledger preservation.
- [ ] Download only the fixed public repository asset. Check API asset identity/size and stream with a cap; release redirects may use the explicitly allowed GitHub asset hosts. Do not forward Authorization or other secrets across redirects and never log signed URLs.
- [ ] Implement shared build/deploy wiring without report commits. Source-only changes become D coordinator requests, not a second production writer. Update monitor for the new workflow's website-build failures while leaving freshness in Deploy.
- [ ] Real isolated browser acceptance on the built synthetic external-content site: EN/ZH switch, latest and dated Asia/U.S./weekly views, actual downloads matching receipt bytes, no-JS content and marker identity. Browser profiles/ports/results task-owned. Existing browser suite also passes.
- [ ] Run complete W gates and combined provider acceptance. Commit, independent task and whole-W review, merge and verify main/legacy deployment. Record W_CONTENT_REV. New mode remains off; do not dispatch production merely to test it.

## Task 4: Deploy durable shared coordinator and remote transport

**Files:** Create D/scripts/site_content/{__init__,config,state,transport,coordinator,verification}.py and D/tests/smoke/test_site_content_{state,transport,recovery}.py. Add only required public installed CLI pins to existing owner dependency configuration after provider merges. Keep secrets out of source and tests.

**Interfaces:** SiteContentConfig holds fixed repository/pages_url, shared state_root/archive_root, trusted installed owner Python/CLI, renderer revision selection and explicit legacy_state_roots for read-only preflight. Environment CONTENT_PUBLICATION_MODE uses the same unset/legacy/artifact-v1 values as the repository variable; SITE_CONTENT_STATE_ROOT, SITE_CONTENT_ARCHIVE_ROOT and SITE_CONTENT_OWNER_PYTHON are trusted private configuration. load_mode returns legacy or artifact-v1 and rejects other values. Frozen ContentRequest has family (asia/us/weekly/renderer), report_id, input_sha256, renderer_revision and created_at_utc. PreparedReport has family, report_id, content_hash and expected_files mapping relative paths to exact SHA256. prepare_inputs(root:Path)->PreparedReport is a trusted family callback, never a manifest command. ContentPublisher.prepare(request,prepare_inputs), advance()->PublicationResult and publish_renderer_update()->PublicationResult share one repository lock. PublicationResult has status (pending/verified/archived/admitted/failed/busy), publication_id, receipt_path and original error; no fake merge_sha. Renderer requests use the admitted bundle identity as input identity and preserve all report bytes.

Durable records schema site-content-publication.v1, active.json plus candidate-specific immutable inputs/package/receipts. Candidate identity hashes bundle identity, renderer revision and expected parent publication id. Phases prepared→asset_uploaded→dispatched→deployed→verified→archived→admitted; archive before success/pointer promotion. Admission CASes expected parent and is idempotent only for identical candidate. All state writes follow existing private-file/symlink and atomic fsync/rename discipline.

Release tag site-content-<bundle_id>, prerelease=true, make_latest=false. Never clobber an asset. Download/hash existing same-tag assets before accepting them after uncertain writes. Dispatch fixed publish-content.yml on main with exact fields; correlate run title/candidate, actual renderer and returned ledger. Query after response loss before retry. No production API write in tests.

- [ ] RED fault injection after each remote/durable boundary, ambiguous existing release/run, mismatched bytes, canceled/pending runs, stale CAS, lock contention, missing archive and crash after deployment before admission.
- [ ] Implement fake peer/local HTTP or command-protocol tests with retained actual byte receipts, not only method-call assertions. Live verification reads fixed HTTPS site marker and selected report/download bytes with limits and host checks.
- [ ] Prove retries reuse archive bytes, no duplicate accepted publication, no success on wrong live data, and original errors/pending/recovery material survive. Preserve every legacy state file/golden receipt.
- [ ] Run focused D gates, commit and independent task review before family integration.

## Task 5: Integrate all family publishers and renderer-only updates

**Files:** Modify D/scripts/publish_market_pages.py, publish_us_daily_pages.py, publish_weekly_pages.py and their source/config modules only as needed; add D/scripts/site_content/sources/{__init__,asia,us,weekly}.py and D/tests/smoke/test_site_content_{families,renderer,compatibility}.py. Extract reusable report preparation from legacy phases rather than copying entire state machines or faking Git commands. Update paired owner/publication docs.

**Interfaces:** Each family adapter validates/captures its original input and calls the existing installed public importer into a supplied external staging root. Existing legacy default paths/methods remain compatible. Artifact mode uses separate family input settings plus SiteContentConfig; it must not require a bot Git branch or mutate source. All families use the same full active snapshot and parent; renderer-only requests reuse identical admitted report bytes and select the latest approved green merged W renderer. Every publisher poll can advance an existing shared candidate or notice a renderer update even if its own family has no new report.

- [ ] RED tests for U.S.→Asia→weekly and alternate interleavings, concurrent starts, same-date revisions/news-parent validation, five-date windows, source update with no new report, wrong renderer CI identity and all legacy constructor/receipt behavior.
- [ ] Implement artifact-mode entry routing before legacy bot-clone requirements. Keep original public markers/hash/date constraints, chart review, report generation ownership and no-model-call publication boundary.
- [ ] Use publication_id/renderer_revision in new verification and delivery adapters. Weekly delivery still requires a matching verified weekly receipt and existing per-target policy; no tests send. Do not force old archive/monitor consumers to reinterpret merge_sha.
- [ ] Run full affected old/new family suites, synthetic installed-provider/coordinator→workflow-shaped input→real local build/browser→receipt/archive acceptance, and D local gates. Commit and independent task review.

## Task 6: Preflight, cutover/rollback documentation and owner integration

**Files:** Add D/scripts/site_content/preflight.py, D/scripts/publish_site_content.py, matching smoke tests and configuration examples; update D/docs/{content-publication,production-migration,boundary-contract} and existing family runbooks with EN/ZH reader counterparts, W docs and P consumer examples if final interface corrections require them. Do not edit real configuration or units.

**Interfaces:** python -m scripts.publish_site_content preflight|bootstrap|advance|reconcile has explicit trusted paths/config and --dry-run. bootstrap requires empty new state plus reviewed renderer/snapshot identity. preflight checks consistent mode/shared root across families, legacy pending and in-flight deployment drain, installed provider/renderer versions, archives, live marker and rollback readiness without remote writes. It returns structured readiness/error evidence, never deletes pending/production files.

- [ ] RED tests for inconsistent modes/roots, old pending, legacy in-flight jobs, nonempty bootstrap, lost-local-state reconciliation, temporary task worktrees or mutable branch paths as production releases, missing rollback snapshot and uncertain active remote publication.
- [ ] Implement dry-run/preflight/reconciliation and prove code-only publication preserves current report identity. Document canceled Actions retry policy and bounded querying.
- [ ] Write concrete activation: reviewed provider and consumer stable releases, no-send checks, retain rollback state, stop old writers/drain, enable shared coordinator/mode atomically, verify first deployment and all families, resume. Actual activation remains a separate authorized operation.
- [ ] Write rollback preserving latest verified content: stop/drain, materialize validated archived public snapshot into a reviewed one-time legacy recovery PR if needed, validate/match it, restore legacy mode/release, publish/verify, resume. Do not simply serve stale Git inputs.
- [ ] Run complete D local gates and final three-owner installed/synthetic/browser combination. Independent task and whole-D review, merge provider-pinned code, verify clean main and preserve production untouched. No private Actions for an empty green status.
- [ ] Verify merged P/W/D revisions, actual existing Pages deployment and source/content availability distinction. Cleanup only confirmed merged task branches/worktrees without unique content; retain DATA receipts and historical archives. Present a concrete separately gated activation proposal with exact release revisions, rollback target and remaining live-only checks, quoting/linking the applicable repository production authorization rule if permission is still needed.

## Self-review receipt

Controller self-review additionally pinned all shared configuration/request/result field names, actual dispatch-head matching, token-free bounded public asset redirects, marker creation before final identity hashing, and rejection of temporary task worktrees while allowing recorded immutable production worktrees. These resolve interface/security/provenance ambiguities without expanding the requested product.


All spec sections map to Tasks1–6; the public eligibility/upload order, source-only deployment protection, cross-family snapshot lock, response-loss recovery, legacy identity compatibility and cutover/rollback failure classes have named owner tests. CLI/schema/marker/mode identifiers above are single definitions, not inferred names. Plan execution records actual merged revisions rather than placeholder source pins. Builder-settleable source extraction details stay within the named ownership boundaries.
