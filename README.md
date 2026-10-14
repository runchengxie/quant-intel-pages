# Quant Market Intel Pages

This repository owns the static website for daily market reports. `quant-intel-platform` owns report generation, evidence review, and the validated public snapshot exporter. `quant-intel-deploy` owns scheduled production publishers.

[中文说明](README.zh-CN.md)

## Local build

Requirements: Python 3.11, Node.js 24, npm, uv, and the `market-export-site-snapshot` command installed from the pinned Platform commit.

```bash
uv tool install "git+https://github.com/runchengxie/quant-intel-platform.git@7b5ab6a318c62292ca3a10178e98d93449c85da7"
npm ci
uv sync --locked --group dev --no-install-project
preview_root=$(mktemp -d /tmp/qmi-preview.XXXXXX)
python3 scripts/build_site.py --output "$preview_root/quant-intel-pages"
python3 -m http.server 8000 --directory "$preview_root"
```

Open <http://localhost:8000/quant-intel-pages/>. The builder asks the Platform CLI to validate and export the current five-date public snapshot, then renders the Chinese and English Astro pages. The site keeps report downloads at `/data/` and `/reports/`.

## Repository layout

- `src/`: Astro frontend, localized pages, chart rendering, and the legacy fallback.
- `artifacts/public/`: reviewed public source snapshots; private archives stay outside this repository.
- `scripts/build_site.py`: frontend build adapter; it does not import Platform source code.
- `scripts/public_site_alerts.py`: tracks this repository's website build workflow and reconciles failure/recovery Issues.
- `.github/workflows/public-site.yml`: static-site checks, publication ledger, and GitHub Pages deployment.

Platform is pinned by commit in the workflow so snapshot validation uses a reviewed owner release. The site workflow has no model credentials and runs no report generation. Public report date and age monitoring belongs to `quant-intel-deploy`. Use `AGENTS.md` and [daily generation options](docs/daily-generation-options.md) for ownership and handoff details.

The website presents market completeness, research inclusion, and publication as separate producer assessments. Status records are accepted only when the report run, date, and content hash match; older snapshots without status metadata show unknown status. Historical report content and quality notes remain available.

The U.S. report image shows each asset’s close or yield in one aligned value column beside its daily change. Change bars center on zero and use an independent scale per group; Treasury yield levels and basis-point changes share a row. Missing historical index closes remain explicit blanks.

Asian interpretation text uses source-bound English catalog translations. When a translation is unavailable, the English homepage labels the gap and links to the preserved Chinese interpretation and its evidence.

## Language behavior

The homepage defaults to English at `/en/`. Select Chinese with `/?locale=zh-CN`; other homepage locale query values use English. Report pages have separate `/en/reports/<id>/` and `/reports/<id>/` routes. Language links preserve the report identity. Downloads retain source data, evidence IDs, hashes, and timestamps across languages. Missing English interpretation translations show an explicit notice and retain access to source-language evidence.

## TypeScript scope

The active frontend libraries and React chart island use TypeScript. Report image controls share a typed module and locale catalog across the four report routes. `npm run check` also checks `ChartCards.astro`.

The JavaScript in `src/legacy/` and `src/lib/market-daily-utils.js` remains a browser-compatible fallback published by the snapshot/build adapter. Converting those files requires preserving their script URLs and browser globals. All authored Astro pages are included in strict checking. Insight presentation fields are validated at the JSON boundary; source identities, hashes and evidence remain language-neutral. Generated output and the installed Platform CLI are excluded separately.

The legacy controller and its three utility modules are authored in `src/legacy-source/` as strictly checked TypeScript. The controller validates presentation fields at the JSON boundary and uses typed DOM elements. Run `npm run legacy:build` after changing them or `market-daily-utils.ts`; `npm run check` rejects stale compatibility bundles. Generated JS retains the existing URLs, browser globals and CommonJS exports. The complete legacy entry has browser coverage for report and date filters, theme persistence, optional-data failures, and safe text rendering. Set `PLAYWRIGHT_PORT` to give concurrent browser runs a separate server port.

Scheduled morning and evening publications use factual reports without generating
AI interpretation. Archived interpretation remains readable; an empty interpretation
history is a supported input and does not block publication.

The Asia report image combines index values and zero-centered return bars in one
table. Industry, turnover, concept and mover tables retain published numbers and
add column-specific bars. Market overview charts retain original text and use
only complete return distributions whose bucket counts match reported coverage.
The bucket containing zero is distinguished from advancing-stock counts.
Malformed or missing facts stay visible as text without invented graphics.
