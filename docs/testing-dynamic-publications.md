# Tests across publication updates

Daily browser tests run against the public build input, including `ASTRO_DATA_ROOT` overrides. They compare the full admitted document inventory, rows, displayed values, cell text, evidence URLs, missing-data notes and disclosure state in both languages. Image panel inventories exclude disclosures exactly as the export contract requires. Source adapters are also tested independently with fixed expected values; browser parity alone does not establish that an adapter interpreted a source correctly.

| Tests | Input and retained assertions |
| --- | --- |
| `editorial-layout`, `report-content-parity` | Current daily input; price, section and row counts follow that input. Responsive geometry applies when the source supplies those panels. Parity must still fail when the renderer drops an expected panel or row. |
| `public-site` | Dated routes come from the visible five-date report window. News status and item identities, text, times and source links follow the latest evening artifact, including absent news. |
| `editorial-reports`, `legacy-controller` | Current daily rendering plus explicit synthetic legacy/error fixtures; optional sections are not assumed to contain a fixed daily edition. |
| `weekly`, `weekly-native`, `site-navigation` | Exact weekly dates, hashes, counts and history are intentional: `weeklyBrowserInput()` installs the retained synthetic weekly fixtures before building. |
| `asia-report-document`, `report-markdown` | Exact complete-document and legacy-table expectations use retained public 2026-10-22/23 fixtures under `tests/fixtures/asia-document`, independent of rolling artifacts. Published/absent supplemental bundles are explicit fixture cases. |
| `astro-pages` | Live source identities/status and current routes, with explicit authored fixtures for optional charts, research, producer status, partial U.S. facts and history. Build outputs are temporary siblings outside the repository on the same filesystem. |
| Other Node unit tests | Inline or `tests/fixtures` inputs; dates and numeric expectations remain fixed parser/rendering regression cases. |

To check a proposed publication without replacing tracked artifacts, export its public tree to a temporary input directory and run `ASTRO_DATA_ROOT=/path/to/public PLAYWRIGHT_PORT=4402 npm run test:browser`. Serialize Astro builds with `npm test` and other browser invocations: their source cache is shared within a worktree. The output directory must be outside the repository and on the same filesystem as the checkout.
