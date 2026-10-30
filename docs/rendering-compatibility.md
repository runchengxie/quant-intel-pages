# Asia rendering compatibility

Active report pages build a `ReportDocument` and render it through the shared website and SVG components. The historical holiday table is admitted by `src/lib/asia-holiday-sessions.ts`.

The parser preserves the published four-market table. It requires an explicit mainland closure, matching report and session dates, finite positive close values, valid percentage text and at least one current open-market observation. Closed or missing markets retain their explicit state and empty values.

`src/lib/asia-report-image.ts` preserves the historical `holidayRows` and `buildAsiaReportSvg` imports. The latter delegates to the implementation in `src/lib/legacy/asia-report-image.ts`. Existing historical renderer regressions continue to exercise that entry.

The active document dependency graph excludes the compatibility image implementation. A bundle regression checks this boundary. Direct parser tests cover malformed rows and admission states, while existing document and renderer tests retain locale, provenance, holiday and escaping checks.

Published CLI commands, artifact schemas and report URLs remain unchanged. The compatibility renderer remains available until its callers and regression requirements can be retired together.
