# Unified navigation implementation plan

> **For agentic workers:** Use superpowers:executing-plans; implement inline with a final independent review.

**Goal:** Unify bilingual navigation and themes; open the weekly landing page on the latest report with older reports below.
**Architecture:** Shared Astro header and pre-paint theme initialization; locale catalog for navigation and About; existing WeeklyPage renders latest or dated content.
**Tech Stack:** Astro, TypeScript, CSS, Playwright.
**Spec:** docs/superpowers/specs/2026-10-24-site-navigation-design.md

## Global constraints

Preserve report dates, hashes, PNGs, language-neutral data, English-default entry,
explicit Chinese routes, stable dated URLs and existing lazy charts. No new
dependencies or scheduler/production configuration/delivery changes.

## Review focus

Storage denied/system theme changes; language switches retain dated routes and
home section hashes; phone header fits both languages; empty/single/multiple
weekly windows; newest report and archive never duplicate the current report.

### Task 1: Shared navigation, theme, About and weekly landing

Files: src/components/SiteHeader.astro, ThemeInit.astro, AboutPage.astro;
src/lib/site-locale.ts; src/styles/site-header.css; existing home/report/weekly
pages and weekly styles; new bilingual about routes.
Interfaces: SiteHeader(locale:'en'|'zh', active?:'us'|'asia'|'weekly'|'about',
switchHref:string, home?:boolean). ThemeInit has no props. WeeklyPage accepts
existing report plus landing?:boolean; landing chooses loadWeeklyRecaps()[0].

- [x] Add browser regression tests: exact navigation order and links, shared
  themes across page navigation, mobile layout, latest report above archive,
  historical selection and locale preservation, About and no-JS report reading.
- [x] Run focused new browser tests; expect failure before implementation.
- [x] Implement catalog, shared components and wiring. Remove duplicate theme
  scripts; migrate source-dependent tests to shared theme sources. Add a second
  synthetic historical report only in isolated browser input.
- [x] Run complete repository gates and inspect mobile/desktop screenshots.
- [x] Independent whole-branch review; correct material findings and verify.
- [ ] Commit, push normal PR, require green checks on exact source revision,
  merge, wait for Pages deployment, verify live behavior and identities.
- [ ] Preserve validation outside repository, fast-forward clean primary and
  clean only this task branch/worktree.

Validation (2026-10-24): baseline Node207 passed; new landing test failed before
implementation. Final Node208, Python34 (85.38% branch coverage), Playwright44
passed. Astro96 files without diagnostics; lint/type/unused-code, npm and locked
Python dependency audits, structure audit and real provider snapshot build passed.
Independent review found a landing redirect issue; fixed with regression coverage,
reviewed again without blockers. Browser tests also exposed phone spacing and
detail-date regressions, both fixed. Real-content screenshots checked at390/1280
in both languages/themes. No published report inputs or delivery settings changed.
