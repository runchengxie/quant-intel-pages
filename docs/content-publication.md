# Build a site from verified external content

[简体中文](content-publication.zh-CN.md)

Pages can render a Platform-verified content bundle without changing committed
report inputs. An opt-in workflow can publish these bundles. Legacy source deployment remains
the default; production activation, publisher coordination and live verification
require the separately configured Deploy coordinator.

Install the [pinned Platform CLI](technical-guide.en.md#local-build). The installed
producer and exporter must both use commit
`70d21f8683cdbe3b7841e2a7f4e10f57d1c2a8be`.
Use the owner's `market-pack-site-content` and `market-verify-site-content`
commands to create an immutable archive and a verified staging root containing
`artifacts/public/data/` and `artifacts/public/reports/`.
See the [Platform bundle contract](https://github.com/runchengxie/quant-intel-platform/blob/70d21f8683cdbe3b7841e2a7f4e10f57d1c2a8be/docs/publication/site-content-bundles.md).

Choose new receipt paths outside the source checkout, inputs and output:

~~~bash
task_output="$DATA_ROOT/quant/quant-intel-pages/tasks/<task-id>"
producer_revision="70d21f8683cdbe3b7841e2a7f4e10f57d1c2a8be"
python scripts/build_site.py --root "$CODE_ROOT/quant/quant-intel-pages" \
  --output "$task_output/site" \
  --public-inputs "$task_output/verified" \
  --content-receipt "$task_output/verify-receipt.json" \
  --identity "$task_output/build-identity.json" \
  --quality-receipt "$task_output/report-validation.json" \
  --task-id '<task-id>' --exporter-revision "$producer_revision"
python scripts/build_identity.py verify \
  --identity "$task_output/build-identity.json" \
  --output "$task_output/site" --quality "$task_output/report-validation.json"
~~~

The Python API adds keyword-only `public_inputs: Path | None` and
`content_receipt: Path | None` to `build_site`. Supply both with
`identity_options`; `summaries_path` is rejected in external mode.
Inputs are the staging root, not its nested `artifacts/public` directory.
Missing or mismatched inputs fail without reading stale repository report data.
Receipt file hashes, sizes, producer revision and exact file membership must match.
Source, inputs, content receipt, output and generated receipts must be separate,
without symlink traversal. The Pages checkout must be clean.

External builds emit `market_intel_pages.build_identity.v2`. It records:

- The actual clean Pages Git revision and absolute source root.
- The verified bundle ID, archive SHA-256, producer revision, creation time,
  ordered original file records and the content receipt's path and bytes hash.
- The original external input root and hashes, the normalized exported snapshot,
  the passed Pages quality receipt and all served output hashes.
- The installed exporter's VCS/RECORD/import evidence and actual isolated command.

The bundle ID and archive digest are content identities, never source commits.
The receipt describes verified input bytes; it does not authorize publication.
Preserve the original archive and owner receipts for audit. The offline identity
verifier validates the recorded v2 fields and final output/quality relationship;
it does not repeat archive verification or establish who approved publication.

Platform owns normalization and public eligibility. Re-export can regenerate health
and U.S. status sidecars and filter source-bound commentary; normalized JSON bytes
can differ from the archive. Original and exported hashes therefore remain separate.
Pages runs the owner exporter and its own quality validator, then requires every
exported download to remain byte-identical in the final site. It does not introduce
a generic exemption for changed files.

Input, receipt, source or exporter changes during rendering block promotion.
Failed promotion restores previous output; if rollback fails, the error identifies
retained recovery material. Use fresh quality/identity receipt paths for a retry.
Identity and content receipts stay outside the public output. Set `ASTRO_WORK_ROOT`
to an external writable directory on the source filesystem when temporary render
files must be placed there; legacy builds retain their existing default location.

Calls without external inputs keep the existing behavior and
`market_intel_pages.build_identity.v1` format. Existing v1 receipts remain readable.
See [the handoff guide](daily-generation-options.md) for publication evidence and
[archive retention](archive-lifecycle.md) before deleting any retained artifacts.

V2 verification requires exact nested generator, exporter, runtime-version, lock and validation fields. It checks recorded command arguments against source/content identity, validates provenance hashes and types, and compares validator revision and hash with the hash-bound quality receipt. This offline check does not rerun the installed exporter.

## Opt-in publication workflow

`CONTENT_PUBLICATION_MODE` is a repository variable. Unset or `legacy` retains
source deployment; `artifact-v1` selects content publication. Other values fail.
This implementation does not activate content production.

Both profiles use `site-build.yml`. Source PRs/pushes retain all source, dependency
and browser checks and exercise a synthetic content profile. In content mode they
produce previews only. Deploy's coordinator must request a new candidate when a
green merged renderer changes, using the latest admitted content; source commits
do not independently deploy stale committed reports.

`publish-content.yml` accepts `candidate_id`, `content_asset_id`,
`content_sha256`, `producer_revision`, `renderer_revision` and
`expected_parent_publication_id`. Dispatch it on main. The renderer must equal
the actual main revision selected by GitHub for that run and have successful main
push source checks and an associated merged PR whose merge commit is that revision
and whose base is this repository’s main. A newer main requires a new renderer candidate. The request
cannot select another checkout, repository, URL or executable.

The workflow downloads only the fixed public Pages repository Release asset API,
checks asset ID/size and exact archive SHA-256, caps streamed bytes at 64 MiB, and
allows at most three redirects to explicit GitHub asset hosts. Requests never carry
Authorization or cookies. The installed pinned Platform verifier then validates
the package before Pages renders it and runs browser smoke checks on that output.

Legacy deployment and the entire content publication transaction share
`quant-intel-pages-production`, with cancellation disabled. GitHub may replace
pending runs; Deploy must reconcile canceled/pending requests and retry immutable
candidates. Environment protection remains `github-pages`.

A candidate compares its expected parent with the served marker before building
and again before deploying. `__bootstrap__` is accepted only when the marker is
absent and no previous successful content workflow exists. It is an explicit
first-content-deployment request, never a fallback after parent mismatch.
A matching candidate with identical content/renderer identity is idempotent and
skips deployment. Reusing its ID for different content fails.

For a formal local publication build, add `--publication-context <JSON path>`
to the external-input command above. The trusted caller supplies exactly
`candidate_id`, `content_sha256`, `producer_revision`, `renderer_revision`,
`workflow_run_id` and `workflow_run_attempt`, all strings. Workflow run values
must match the ambient Actions context. This file must be separate from source,
inputs, output and receipts; never obtain it from the bundle.

After quality checks and before final hashing, Pages adds
`data/site-publication.json` with schema
`market_intel_pages.site_publication.v1`, publication/bundle/archive identity,
producer/renderer revisions and run/attempt. Bundle inputs cannot supply this
reserved path. The v2 identity binds its exact marker bytes and trusted-context
receipt. Private identity/context files never enter the public site.

The existing `market-intel-ledger-<run>-<attempt>` artifact retains the original
archive, verified input tree, owner receipt, context, build identity, quality
receipt and final data/report downloads including the marker. Actions retention
is 90 days; Deploy still owns permanent archival and live report/date/hash checks.
The monitor tracks source and content build failures separately; report freshness
remains Deploy-owned.

Before activation, separately authorize and perform the coordinator bootstrap,
drain legacy pending/in-flight publications, and change the repository variable.
Rollback requires a reconciled archived snapshot and pinned legacy publisher;
merely reenabling stale committed inputs is insufficient.
