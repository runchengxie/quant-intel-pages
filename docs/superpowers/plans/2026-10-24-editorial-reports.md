# Editorial reports implementation plan

> **For agentic workers:** Use parallel focused tasks for the independent U.S./Asia components; root integrates and verifies, with final independent review.

**Goal:** Ship the approved editorial design as responsive native reading for all three report families.
**Architecture:** Shared editorial tokens/layout; native daily components consume existing validated summaries and sanitized report text. Existing SVG export remains in a collapsed image view.
**Tech Stack:** Astro, TypeScript, CSS, existing report parsers/validators and Playwright.
**Spec:** docs/superpowers/specs/2026-10-24-editorial-reports-design.md

## Constraints and review focus

No report/public-data mutations or image identity changes; no sending/schedule changes.
English-default and explicit Chinese routes, all dated/history links remain stable.
No-JS reading, storage-denied themes, mobile native width, partial/missing data,
independent market dates, provisional scoring, translation fallback, full evidence,
and existing PNG downloads must remain correct. Preserve image-renderer assertions
while adapting visibility tests to the explicitly expanded export view.

### Task 1: Native U.S. report

Files: components/UsNativeReport.astro, lib/us-native-report.ts, lib/us-native-locale.ts,
new meaningful unit tests. Interface: summary: MarketDailySummary; locale:'en'|'zh'.
- [x] Test admitted data selection, unpaired/missing returns, units/dates, safe sources,
  no invented claims; watch fail, implement, pass.
- [x] Render all admitted summary facts/claims, not only visual-study excerpt.

### Task 2: Native Asia report

Files: components/AsiaNativeReport.astro, lib/asia-native-report.ts,
lib/asia-native-locale.ts and meaningful unit tests.
Interface: report:{id,date,kind,...}; markdown:string; locale:'en'|'zh'.
- [x] Test holiday/open-market distinction, missing values, table/score preservation,
  sanitization and translations; watch fail, implement, pass.
- [x] Native complete report plus honest numeric previews; no source-image dependency.

### Task 3: Shared layout and integration

Root owns styles/report-editorial.css, existing home/daily detail/weekly routes,
weekly styles/locale, documentation and browser tests. Shared component classes:
report-native, report-stats/report-metric, report-section, report-layout/report-aside,
native-return, native-table-wrap, report-caption/report-caveat, native-chart.
- [x] Add failing browser coverage for native daily text/no whole SVG dependency,
  bounded phone figures, shared theme tokens, no-JS and explicit image export.
- [x] Wire both home locales, Asia dated and U.S. history. Native view first, old
  image view collapsed; preserve export IDs/download attributes and exact SVGs.
- [x] Apply editorial type/grid/tokens to weekly/About/header; reduce first-screen
  administrative chrome without hiding material caveats or source records.
- [x] Full local gates sequentially where Astro cache is shared; real provider
  snapshot build and 390/768/1280 screenshots in both locales/themes.
- [ ] Independent review, corrections, normal commit/push/PR/checks/merge/deploy.
- [ ] Verify public routes, native width, no-JS, dates/hashes and PNG outputs; save
  evidence under project data and clean only this task branch/worktree.

Validation (2026-10-24): baseline208; final218 Node tests passed; Python34 passed
with85.38% branch coverage; Playwright53 passed. Astro106 files without
diagnostics; lint/type/unused-code, dependency and structure audits passed. Actual
provider export/build passed; real-report visual review24 combinations covered
en/zh, light/dark,390/1280 widths without overflow or script errors. Independent
review found no blockers. Stable Deploy image extractor returned byte-identical
SVGs and matching source identities for both report families before/after the
presentation change. See task evidence for provider release/renderer hashes.
