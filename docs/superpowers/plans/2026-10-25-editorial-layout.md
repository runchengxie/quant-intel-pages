# Editorial Layout Implementation Plan

**Goal:** Restore the approved editorial reading hierarchy and explain supplemental chart availability accurately.
**Architecture:** Keep ReportDocument as the content authority. Give native panels semantic layout classes and responsive grids independent of the image compositor. Track optional chart-bundle availability separately from individual metric status.
**Tech Stack:** Astro, TypeScript, CSS, Node tests, Playwright.
**Spec:** ../specs/2026-10-25-editorial-layout-design.md

## Constraints and review focus

Preserve source dates, hashes, safety validation, publishers and original PNGs.
Check mobile overflow, long English labels, missing values, absent supplemental
bundles, published degradation, history-only charts and no-JavaScript reading.

## Tasks

- [x] Reproduce the five missing cards from the latest actual input; add failing
  availability regressions, implement accurate collapsed status, verify focused tests.
- [x] Add browser regression for desktop paired figures and primary metric grids,
  phone stacking, no duplicate rows, localized disclosure and dark/no-JS support.
- [x] Restore native layout in ReportDocumentView.astro and report-editorial.css;
  keep image composition independent and shared content intact.
- [ ] Run full repository gates and inspect desktop/mobile screenshots. Verify
  actual consumer SVG-to-PNG conversion without sending.
- [ ] Independent whole-branch review; resolve blockers, commit/push/PR and merge
  after checks; verify live deployment and clean only this task's worktree.

## Progress

2026-10-25: User approved the proposed direction. Main 1c395ed inspected clean;
task worktree created from current origin/main. Latest Oct23 supplemental chart
JSON absent; Oct19–22 bundles present. Root owns layout/integration/Git;
asia_chart_availability owns adapter availability and focused tests.

Diagnosis: Oct23 publisher success records candidate status `private chart
manifest identity mismatch`, automatic audit unavailable, and no expected chart
files. Publication completed 19:15:12; the shared evening manifest was generated
19:56:04 and its reviewed version written 20:02:22. The publisher reads the mutable
shared manifest and skips already-successful report dates. Therefore late chart
readiness does not backfill a published edition. Date validation correctly failed
closed. This task corrects the reader-facing status and layout; an immutable dated
candidate contract and chart-only backfill transaction remain upstream follow-up,
not a change to data or production publishing in this frontend task.

Validation: 60 browser checks passed, including a RED→GREEN check for stray zero text from empty notes; 34 Python tests, 85.38% coverage; Astro reports no errors/warnings/hints. Desktop/mobile screenshots inspected in both locales and themes. Independent review found no blockers. Final Node and publisher render checks recorded with task evidence outside the repository.
