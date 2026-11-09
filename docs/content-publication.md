# Build a site from verified external content

[简体中文](content-publication.zh-CN.md)

Pages can render a Platform-verified content bundle without changing committed
report inputs. This is a local build capability; the existing source workflow
still deploys committed inputs. Content production activation, workflow dispatch,
publisher coordination and live verification are separate work.

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
