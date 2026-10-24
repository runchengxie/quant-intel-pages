# Native bilingual weekly report

User approved moving the PNG-led weekly report to responsive Astro HTML/CSS and
SVG, keeping Feishu image-only and preserving the same public data/source identity.

Design: display localized summary cards, four server-rendered SVG trend panels
(12-week value return, wealth index, relative size strength, crowding), and native
localized report text. Static plots are readable without JavaScript and use HTML
labels/ticks that remain legible on small screens. Retain the lazy interactive
charts as progressive disclosure, source tables and original Chinese report in
folded sections. PNG remains an explicit download only and is not eagerly loaded.

English is deterministic translation of the producer's fixed report phrases,
preserving every number, date, sample scope and limitation. Unknown paragraphs
must be flagged and remain available in original text; never invent an inference.
All UI/translation copy belongs in locale catalogs. No changes to publication
contracts, research calculations, message destinations or delivery receipts.

- [x] Add presentation translation and numeric-preservation/fallback tests.
- [x] Add bounded SVG plot geometry and zero/flat/single-point/date tests.
- [x] Refactor WeeklyPage into mobile single-column and desktop grid, preserve
  report hash/date, exact PNG download URL/filename and language/date navigation.
- [x] Test no eager PNG request, no-JS SVG/text, both languages at 390/768/1280,
  working lazy charts and exact image download. Inspect screenshots.
- [ ] Complete repository gates and independent review, normal PR/checks/merge.
- [ ] Verify live pages and data/image identity; retain existing send receipts.
  Clean only this task branch/worktree and record validation under project data.

Ownership: translator agent owns new weekly-report-text/translation catalog and
its unit tests. View agent owns WeeklyPage.astro, weekly-native.css and new browser
tests. Root owns WeeklyTrend.astro, weekly-trend.ts/tests, weekly-locale catalog,
Git operations, final integration/gates, publication and cleanup. No shared file
writes without coordinating. Existing browser weekly expectations may be updated
by root after the view agent adds the new native tests.

Interfaces: weeklyReportPresentation(markdown, locale) -> {markdown, untranslated:string[]}.
WeeklyTrend Props: title, rows (date + numeric fields), fields ({key,label,color}[]),
locale ('en'|'zh'), unit (localized unit text), includeZero? and domain?:[number,number].
The SVG component receives already admitted public rows; it only computes geometry.
Root extends weeklyLabels with native report/summary state labels for the view.

Validation (2026-10-24): Node 207 tests, Python 34 tests (85.38% coverage),
Playwright 34 tests, Astro 88 files without diagnostics, actual provider export/build,
linters, dependency audits and structure audit passed. Independent review found no
blocking issues. Publication and live verification follow via the normal PR workflow.
