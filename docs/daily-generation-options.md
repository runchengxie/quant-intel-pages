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

The website workflow preserves `market-intel-ledger-<run_id>-1`, containing the validated `data/` and `reports/`. Deploy uses this ledger to verify publication inputs. A successful build confirms snapshot validation and static rendering. Confirm production publication using Deploy publisher state and actual Pages URLs.

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
