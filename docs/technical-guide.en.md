# Website maintenance guide

[简体中文](technical-guide.md) · [Project overview](../README.md)

This guide covers local builds and the rules that keep published reports intact.
For report ownership and publication records, see [the handoff guide](daily-generation-options.md).

## Local build

Use Python 3.11, Node.js 24, npm and uv. Install `market-export-site-snapshot` from the pinned Platform commit.

```bash
uv tool install "git+https://github.com/runchengxie/quant-intel-platform.git@c761aaa22cebd72283063ca11c4f1632f1c439fc"
npm ci
uv sync --locked --group dev --no-install-project
preview_root=$(mktemp -d /tmp/qmi-preview.XXXXXX)
python3 scripts/build_site.py --output "$preview_root/quant-intel-pages"
python3 -m http.server 8000 --directory "$preview_root"
```

Open <http://localhost:8000/quant-intel-pages/>. The builder asks the Platform CLI to validate and export the current five-date public snapshot, then renders the Chinese and English Astro pages. The site keeps report downloads at `/data/` and `/reports/`. The builder stages the export and rendered site before replacing the destination. Missing CLI or failed Astro builds leave existing output intact. Keep outputs, logs, raw data and credentials outside Git.

## Repository layout

- `src/` contains the Astro frontend and localized pages, including charts and the legacy fallback.
- `artifacts/public/` holds reviewed public inputs. Private archives stay outside this repository.
- `scripts/build_site.py` calls the installed Platform CLI to prepare frontend inputs. It does not import Platform source code.
- `scripts/public_site_alerts.py` tracks website builds and updates failure or recovery Issues.
- `.github/workflows/public-site.yml` checks and deploys the static site, retaining a publication ledger.

Platform is pinned by commit in the workflow so snapshot validation uses a reviewed owner release. The site workflow has no model credentials and runs no report generation. Public report date and age monitoring belongs to `quant-intel-deploy`. Use [AGENTS.md](../AGENTS.md) and [daily generation options](daily-generation-options.md) for ownership and handoff details.

The website presents market completeness, research inclusion, and publication as separate producer assessments. Status records are accepted only when the report run, date, and content hash match; older snapshots without status metadata show unknown status. Historical report content and quality notes remain available.

The U.S. report image shows each asset’s close or yield in one aligned value column beside its daily change. Change bars center on zero and use an independent scale per group; Treasury yield levels and basis-point changes share a row. Missing historical index closes remain explicit blanks.

Asian interpretation text uses source-bound English catalog translations. When a translation is unavailable, the English homepage labels the gap and links to the preserved Chinese interpretation and its evidence.

## Language behavior

The homepage defaults to English at `/en/`. Select Chinese with `/?locale=zh-CN`; other homepage locale query values use English. Report pages have separate `/en/reports/<id>/` and `/reports/<id>/` routes. Language links preserve the report identity. Downloads retain source data, evidence IDs, hashes, and timestamps across languages. Missing English interpretation translations show an explicit notice and retain access to source-language evidence.

Run `npm test`, `npm run check`, the site build and browser tests sequentially
within one checkout. The Node suite also invokes Astro builds, which share the
checkout's `.astro` cache even when final output directories differ. Concurrent
builds can remove each other's prerender files.

## TypeScript scope

The active frontend libraries and React chart island use TypeScript. Report image controls share a typed module and locale catalog across the four report routes. `npm run check` also checks `ChartCards.astro`.

The JavaScript in `src/legacy/` and `src/lib/market-daily-utils.js` remains a browser-compatible fallback published by the snapshot/build adapter. Converting those files requires preserving their script URLs and browser globals. All authored Astro pages are included in strict checking. Insight presentation fields are validated at the JSON boundary; source identities, hashes and evidence remain language-neutral. Generated output and the installed Platform CLI are excluded separately.

The legacy controller and its three utility modules are authored in `src/legacy-source/` as strictly checked TypeScript. The controller validates presentation fields at the JSON boundary and uses typed DOM elements. Run `npm run legacy:build` after changing them or `market-daily-utils.ts`; `npm run check` rejects stale compatibility bundles. Generated JS retains the existing URLs, browser globals and CommonJS exports. The complete legacy entry has browser coverage for report and date filters, theme persistence, optional-data failures, and safe text rendering. Set `PLAYWRIGHT_PORT` to give concurrent browser runs a separate server port.

Scheduled morning and evening publications use factual reports without generating
AI interpretation. Archived interpretation remains readable; an empty interpretation
history is a supported input and does not block publication.

The Asia report image combines index values and zero-centered return bars in one
table. Industry, turnover, concept and mover tables retain published numbers and
add column-specific bars. Chart-covered overview, limit and flow paragraphs are omitted; uncharted text
and malformed facts remain visible. Gain and loss Top 5 use separate groups
with a shared return scale. Lower dashboard counts are omitted only when values,
units, dates and known source contracts match already drawn report facts.
Market overview charts use
only complete return distributions whose bucket counts match reported coverage.
The bucket containing zero is distinguished from advancing-stock counts.
Malformed or missing facts stay visible as text without invented graphics.

Asian evening images also consume the producer’s dated Asian-market overview on ordinary and mainland-holiday editions. Hong Kong, Japan and Korea retain independent session dates, closed/missing/pending states, and source attribution; the website does not fetch or backfill quotes. Legacy holiday tables remain readable.

Weekly market/style reports are available from the home navigation at `/en/weekly/`
(English) and `/weekly/?locale=zh-CN` (Chinese). The landing page opens the latest
edition directly, with earlier public editions below. Dated pages retain the trading cutoff
in their URL. Each page presents responsive native text, localized summary cards and four static
SVG trend panels. English report text preserves the source numbers and caveats;
unrecognized new source passages are flagged, with the full Chinese original in
a folded section. The approved PNG is available as a download and loads only when requested.
ECharts loads only when the interactive section opens; text, SVGs and observation
tables remain usable without JavaScript.

The weekly input is optional until a public bundle is imported. Present weekly data
fails the build if its schema, Python canonical content digest, attachment hash,
identity, date order, provenance, or bounded five-report history is inconsistent.
Python 3 is required at build time to preserve the producer's canonical JSON numeric
spelling. Browser tests stage synthetic weekly inputs and build output outside the repository;
the fixture is never inserted into production artifacts.

All report pages share navigation for U.S. Morning, Asia Evening, Weekly Style Analysis
and About, followed by language and theme controls. The language switch retains the
current edition or home section; the theme follows the system until explicitly chosen
and persists across pages. `/en/about/` and `/about/?locale=zh-CN` explain the reports,
dates, sources and limitations, and link to detailed methods.

## Editorial report reading

U.S. morning, Asia evening and weekly reports share a serif heading system,
neutral paper palette, accessible light/dark tokens and ruled metric strips.
Daily reading uses native HTML with independently sized figures and scrollable
evidence tables; the full report no longer requires dragging a fixed-width SVG
on a phone. Complete admitted facts, source dates, session states, caveats and
reviewed evidence remain available without JavaScript.

Native pages and downloadable SVGs now render the same report document, using
shared typography, colors, chart geometry and validated facts. Each security row
combines its closing level or price with its return bar. Asia retains the image
edition's chart inventory; additional rows, evidence and the full original are
available in folded sections below the charts.

The native page uses primary metric strips, paired secondary figures and separate
prose columns on wide screens, then stacks figures on phones. Images use their own
linear composition with the same content and design tokens. Common observation
dates and identical sources appear once per panel; differing source URLs and
observation dates remain associated with their individual rows.

Asia's optional supplemental chart bundle is separate from chartable facts in the
daily report. An absent bundle produces one expandable availability note, rather
than five empty charts. Published data limitations remain visible, and historical
series retain their actual observation dates. This presentation does not backfill
late chart bundles or change the publisher's source-identity checks.

The optional Image edition preserves the publisher's container IDs and image
identity controls. Weekly offers a newly styled derivative while retaining the
immutable original published PNG. The delivery integration uses the derivative
for future sends; existing delivery receipts remain authoritative. Weekly also
retains four native trend panels, lazy interactive views and dated history links.
