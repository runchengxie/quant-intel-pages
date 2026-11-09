# Content publication without report commits

[简体中文](2026-11-09-content-publication-design.zh-CN.md)

Status: implementation requested by the owner on 2026-11-09 after reviewing the proposed generation → validation → immutable content package → fixed renderer → deployment → live verification flow. This document records technical defaults for that request. It does not authorize changing production configuration, timers, credentials, or sending messages.

## Outcome

Keep Astro and GitHub Pages. Updating a daily or weekly report can publish a new website without adding generated reports, images, or JSON to the source branch. Code changes retain reviewed PRs and full source quality gates. Content changes retain owner validation, rendering, publication receipts, permanent private archives, and online date/hash verification.

A successful upload or Actions run is not proof that the intended report is publicly visible. Publication completes only after the correct renderer, content identity, and existing report/download URLs are verified.

## Current system and alternatives

Platform owns generation, public projection, report contracts and the installed snapshot CLI. Pages owns Astro, its quality validator, static downloads and Pages workflows. Deploy owns three report-family publishers, durable pending/success state, archival, delivery and production scheduling. Existing Pages inputs are committed under artifacts/public; builds already deploy an Actions artifact rather than committing rendered HTML.

| Approach | Tradeoff | Decision |
| --- | --- | --- |
| Continue report PRs | Small operational change and useful Git history; generated inputs accumulate and every report follows source CI | Preserve as the legacy recovery route |
| Immutable public content packages, explicit deployment requests and one publication coordinator | Reuses GitHub hosting/authentication while separating code from content; requires shared publication state and recovery tests | Chosen implementation of the owner's requested flow |
| Object storage/CDN or a dynamic application | Useful for large archives, frequent updates or private access; adds services and configuration | Deferred |

The implementer's transport default is a content-addressed GitHub Release asset in the existing public Pages repository. It needs no new hosting provider. Release tags are content-specific prereleases and do not take over the repository's ordinary latest release. No real package will be uploaded as part of synthetic development validation.

## Ownership and delivery units

Platform adds a standard-library content-package CLI beside market-export-site-snapshot and a public versioned transport contract. It reuses current report projections and validators; tar/ZIP integrity alone never grants public eligibility.

Pages accepts a verified external input tree while preserving separate clean renderer identity, actual installed exporter provenance, input hashes, quality receipt and final output hashes. Code source and report inputs must not be conflated. English/Chinese readers and all existing URLs retain their behavior.

Deploy calls installed pinned owner CLIs, never sibling Python sources. It stages current family inputs through the existing validated importers, then publishes the resulting complete public snapshot through a shared coordinator. Existing report generation, research, model calls, delivery policy and historical receipts keep their owners.

Merge Platform's provider first, Pages' consumer second, then Deploy's consumer. Exact merged provider revisions and tested consumer/provider combinations are recorded. Existing production releases and pending transactions remain unchanged.

## Content package contract

The initial contract is market_intel.site_content_bundle.v1. A package contains a canonical manifest and only the Platform-exported data/ and reports/ payload. It never contains source code, private raw inputs, credentials, build caches or executable workflow files. Existing indexed five-date publication windows remain enforced separately for supported report families. Historical Git/archive material is not deleted.

The manifest records explicit publication=public, creation time supplied once for the durable candidate, actual installed producer revision/source identity, each relative file's SHA-256 and byte length, and a content identifier derived from canonical manifest data. The exact archive byte digest is separate from the logical content identifier. Repeated retries reuse the same bytes.

Limits default to 64 MiB archive bytes, 256 MiB total expanded payload, 16 MiB per file and 4096 files. Reject duplicate names, unknown manifest keys/schema, absolute/dot/backslash/drive paths, symlinks/hardlinks, devices, unsupported members, invalid sizes/digests and unexpected files. Validate all members before promoting output. Do not extract arbitrary archives directly into a checkout.

The owner packer invokes the existing public snapshot export/projection and applies existing public field/schema checks to every supported family before a public upload can occur. A raw report's private fields or an unindexed file cannot become public by being included in the input directory. Reuse current validators; if the existing exporter lacks a public-snapshot validation boundary, add that boundary in Platform rather than duplicating report logic in Deploy or Pages.

The verifier checks exact downloaded bytes, manifest identity, every file and public eligibility, then materializes a new external staging root in the shape expected by the owner exporter. Re-exported normalization and original package bytes have separate hashes. Demonstrate that the exported snapshot can be consumed again without losing supported report families.

## Renderer and publication receipts

Legacy source-input builds retain their existing identity schema and behavior. External-content builds use an additive identity version carrying content bundle identity/digest, producer revision, original external inputs, actual exported snapshot and renderer source revision separately. Existing exporter installation/RECORD checks, -I isolation, output preservation, quality-validator binding and output hash verification remain required.

Serve a small public publication marker under /data/site-publication.json. It includes candidate identity, bundle identity/digest, renderer revision and actual Actions run/attempt. It exposes no private state path, target, token or operator metadata. Existing /data/ and /reports/ downloads remain byte-bound to the validated snapshot. The marker is not a substitute for verifying the selected report's date, revision and expected files.

A durable content publication receipt uses explicit publication_id, renderer_revision and bundle fields. Do not put a bundle digest in legacy merge_sha or invent a commit. Legacy v1 receipts and their original semantics remain readable.

## One production deployment path in content mode

Changing only the report publisher is insufficient: an ordinary code push could otherwise rebuild stale committed content and overwrite the latest report. Content mode therefore has one explicit production workflow and one shared publication coordinator.

A repository-level opt-in mode leaves the existing legacy path unchanged by default. In content mode, source PR/push workflows run full source checks and previews but do not independently deploy committed report inputs. The coordinator notices an approved new renderer revision even when no report changed and requests deployment of that renderer with the latest admitted content. No periodic report commit is needed. This introduces at most the existing publisher polling delay for code publication.

The explicit workflow accepts only an immutable content asset identifier/digest, candidate identity and an approved merged renderer revision. No request chooses an arbitrary URL, repository, command, import or code branch. Download from the fixed repository API, check size/digest before unpacking, revalidate through the pinned installed owner, render, run content/page smoke checks, upload the site artifact and deploy through the existing protected github-pages environment. Keep the branch protection and environment rules.

Use a common production concurrency group for old/new deployment paths and drain in-flight legacy runs during a separately authorized cutover. GitHub concurrency is not a FIFO queue: canceled/replaced pending requests must be observable and resumable. No activation while a legacy pending transaction or in-flight deployment could overwrite content mode.

## Shared coordinator and revisions

Asia, U.S. and weekly publishers use one configured content state root and one cross-process repository-level lock in content mode. Their existing individual legacy pending files are not reinterpreted as new content state.

Bootstrap from an explicit reviewed public snapshot/renderer revision only when shared state is empty and the operator requests bootstrap. If state already exists, validate it and never silently replace it with committed old data.

Each candidate starts from the last admitted full public snapshot. Apply only the current family's existing public importer, preserve other families, enforce the current publication window, pack once and persist candidate bytes and expected parent identity before any remote write. Same date/new content hash is an explicit revision, not a duplicated new report date.

Minimal durable phases are prepared, asset_uploaded, dispatched, deployed, verified, admitted and archived. Each phase records the remote asset/run identity and exact bytes it covers. The active public snapshot pointer changes only after matching deployment and live verification; expected-parent compare-and-swap rejects stale candidates. A new family waits or advances the existing candidate instead of constructing another snapshot from an obsolete parent.

A timed-out upload or dispatch is reconciled by querying the remote asset/run identity before retrying. Ambiguous or multiple mismatched candidates fail closed. Failed builds, wrong live hashes, stale report dates and canceled runs cannot produce success receipts. Archive original input/manifests, package, build identity, quality report, deployment identity and actual verification results permanently under Deploy's existing archive contract.

A crash after remote deployment but before local admission must recover by matching the pending candidate, run receipt and live marker. It cannot bootstrap old content or silently skip the live check. A source-only update republishes the admitted content with a new renderer, preserving all report bytes and identities.

Weekly image delivery remains a separate existing effect: only a verified matching weekly publication receipt can admit it, and development tests never send messages. Existing report freshness monitoring remains Deploy-owned.

## Compatibility and activation

Legacy mode remains the default until an explicit production change. No historical report/Git history/receipt is rewritten or deleted. Do not rename old state fields, reset pending files, rewrite shared hooks or alter production services merely to validate this task.

Implementation includes configuration templates, preflight/drain checks, no-send synthetic smoke tests, stable-release instructions and a concrete rollback procedure. Existing production files/timers/current links, repository mode variable and live publication require separate authorization under repository instructions. Ask only after the tested release/cutover proposal is concrete; code review/merge authorization is already standing.

Rollback returns to a pinned legacy renderer/publisher and reconciled archived public snapshot. Simply reenabling an old push workflow against stale committed inputs is not an acceptable rollback. Keep both the latest verified content and the previous verified release available.

## Acceptance

- Package exact round trip, canonical identity, public whitelist, all report families, absent/empty distinctions and limits; hostile paths/links/duplicates/bombs/unknown fields rejected without partial promotion.
- External-input rendering preserves source cleanliness, pinned exporter provenance, actual data bytes, validation identity, locale links, report routes/downloads and prior output on failure.
- A source-only update preserves latest report bytes. Interleaved U.S./Asia/weekly updates preserve one another. Same-date revisions and bounded windows remain correct.
- Faults after upload/dispatch/deployment/verification are resumable; remote-response loss does not duplicate publication; stale parents cannot advance active state. Old pending/receipts remain unchanged.
- Full affected owner quality gates, representative installed owner CLI tests, and actual isolated browser checks on a locally built synthetic site pass before merge.
- No live report generation, production scheduler/configuration changes, real asset upload, production workflow dispatch or delivery occurs during synthetic verification.
