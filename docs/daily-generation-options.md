# Daily report generation and website handoff

[简体中文](daily-generation-options.zh-CN.md)

## Responsibilities

`quant-intel-platform` owns data, reports, and public snapshot validation. `quant-intel-pages` renders and hosts the static website. `quant-intel-deploy` owns production publishers and timers.

Deploy publishes reviewed Platform snapshots with explicit public markers to Pages `artifacts/public/`. The Pages `public-site.yml` workflow calls `market-export-site-snapshot` from a pinned Platform commit, validates and exports `data/` and `reports/`, then builds Astro pages. This workflow does not generate reports, call models, or require model credentials.

## Changes

- Report definitions, retrieval, calculations, model calls, and evidence review belong to Platform.
- Layout, translations, routes, downloads, and static presentation belong to Pages.
- Timers, private runtime directories, publisher state, and bot PRs belong to Deploy.
- Cross-repository interfaces use versioned public files or a pinned installed CLI. Do not import source code from a neighboring checkout.

## Publication records

The website workflow preserves `market-intel-ledger-<run_id>-1`, containing the validated `data/` and `reports/`, the external `build-identity.json`, and `report-validation.json`. Deploy uses this ledger to verify publication inputs. A successful build confirms snapshot validation and static rendering. Confirm production publication using Deploy publisher state and actual Pages URLs.

### Build identity

Formal workflow builds require `market_intel_pages.build_identity.v1`. It records the clean Pages revision, installed exporter's immutable VCS commit, launcher and owner package RECORD hashes, and actual module import origin, installed dependency versions and lock hashes, original public inputs, the exported validation snapshot, the passed quality receipt, and every final output file. The original inputs, exported snapshot and rendered output are separate trees. Formal export uses the audited interpreter with `-I` and clears `PYTHONPATH`/`PYTHONHOME`. Every exported snapshot file must survive final assembly with identical bytes; renderers cannot replace validated downloads. A summaries override must be outside the output tree. Input changes or receipt failures prevent output promotion; failed rollback retains recovery material and reports its location.

The workflow verifies output and quality hashes before uploading the site. Identity files stay outside public website output. The task ID includes the actual run ID and attempt; the ledger name retains its existing `-1` suffix for compatibility. The ledger artifact is retained for 90 days; Deploy's existing archival step stores it permanently under its configured archive root in `pages_ledgers/<artifact-id>`, with a separate artifact/run/hash receipt. A `completed` identity describes a build; publisher state, the matching workflow deployment and actual URLs establish publication.

Local identity is opt-in and requires clean source plus a VCS-installed pinned exporter (directory/editable installations are rejected). Use the pinned CLI installation from the [local build guide](technical-guide.en.md#local-build), ensure `DATA_ROOT` is resolved for this machine, and choose a new task directory:

```bash
task_output="$DATA_ROOT/quant/quant-intel-pages/tasks/<task-id>"
mkdir -p "$task_output"
python scripts/build_site.py --output "$task_output/site" \
  --identity "$task_output/build-identity.json" \
  --quality-receipt "$task_output/report-validation.json" \
  --task-id '<task-id>' --exporter-revision '<installed-40-character-commit>'
python scripts/build_identity.py verify --identity "$task_output/build-identity.json" \
  --output "$task_output/site" --quality "$task_output/report-validation.json"
```

Receipts must use new paths outside source and output, and must not traverse symlinks. The exporter needs a direct Python console script. Missing provenance or quality evidence blocks formal mode. Ordinary builds without these four identity options remain available. Identity records observed bytes and provenance; it does not promise identical outputs across different operating systems or dependency environments. Historical builds keep unknown source/task/agent values unknown. No identity grants permission to delete an archive; apply the separate [archive lifecycle](archive-lifecycle.md) and an explicit owner retention decision.

Production credentials, stable release directories, and timers belong outside Git. Development tasks must not change or trigger them. Before changing production publishers, inspect pending receipts, rollback releases, and both report URL families in a separate deployment change.

## Asian market overview handoff

Platform publishes `### 亚洲市场概览` with six columns (`市场 | 指数 | 数据日期 | 收盘 | 涨跌幅 | 状态`) and exactly Hong Kong/Hang Seng, Japan/Nikkei 225 and Korea/KOSPI rows. Mainland indices remain in their own report module. Verified closes require the report’s session date plus source URL, exchange-close timestamp and evidence ID. Closed, unavailable and not-yet-closed markets carry em dashes instead of old prices. Pages renders these same Markdown facts and source notes without requesting quotes or inferring calendars. Malformed/stale or unproven rows stay explicit as fallback text while other verified markets remain visible. Historical four-column mainland-holiday tables remain supported.

Existing report formats remain supported. The Asian overview module requires a matching Platform producer. A Pages source change alone does not update that producer or its production scheduler.

### Weekly public handoff

Platform owns `market-export-weekly-recap` and `market-import-weekly-recap`.
The explicit public bundle contains `weekly_recap.json`, `<date>-weekly.md` and
`<date>-weekly.png`; imports retain at most five cutoff dates in
`artifacts/public/data/weekly_recaps.json` and update `weekly_recap.json`.
The installed pinned Platform snapshot exporter must admit these records and
attachments before the Pages adapter builds them. No sibling source is imported.

Pages independently checks the exact allowlist, Friday report identity, aware
creation timestamp, source dates, ordered bounded series, canonical Python JSON
SHA256, and the matching Markdown and PNG. It renders sanitized Markdown and retains
only supplied observations: 12-week return in percent, wealth index, size relative
strength, and crowding from zero to one. Native responsive cards, text and SVG
trends form the reading view; the PNG remains an explicit download with unchanged
identity. English presentation uses fixed producer templates, preserving all
numbers, source dates and limitations. Unknown new paragraphs are visibly flagged
and retained in the folded Chinese original. Locale links preserve the dated
report route; static content works without JavaScript.

Deploy manages schedules and image delivery. It verifies the deployed report identity
before delivery as part of its publication transaction. Use publisher receipts and
actual report URLs to confirm publication after a local build.

### Native reading and preserved image export

The editorial frontend renders admitted daily reports as native HTML. The image
SVG remains unchanged inside an optional `details[data-report-export]`; exporters
continue selecting the unique `#market-daily-chart svg` / `#asia-daily-chart svg`
and matching identity button. Static HTML extraction does not require opening
the details element. Report source/hash contracts and delivery receipts do not
change with this presentation update.
