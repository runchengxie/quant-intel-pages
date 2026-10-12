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
