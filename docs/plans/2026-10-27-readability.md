# Daily report readability

Approved audit scope: distinguish U.S. trading dates, actual generation timestamps and planned Beijing publication times; round standalone display metrics to two decimals; disclose remaining table row counts; enlarge reading and source text; translate known English presentation terms.

Raw report files, evidence, IDs and source URLs remain unchanged. Unknown research prose and proper names remain available in the original evidence. Format only standalone decimal values at the HTML rendering boundary, leaving document data and image composition unchanged. Tiny nonzero values below 0.005 retain their precision; other rounded values retain the exact source text in a title attribute.

Validate with Node regression tests, Astro checks, build and Playwright desktop/mobile checks. No report generation or production configuration changes.

## Verification record

Validated 2026-10-27 against source revision 1ab556b, including target main 2d2911d and its latest evening report. Astro checked 130 files without diagnostics; 62 Playwright cases passed, including content/source parity and both locales on mobile. Python passed 34 tests with 85.38% coverage. All 245 Node tests passed, including the bilingual regression requiring an explicit missing-generation label instead of an observation-time fallback. Dependency audits and static checks passed. Public input files are unchanged.

The installed snapshot-export CLI is unavailable locally, so the adapter command was not run; Astro built existing public inputs. Unknown original evidence is retained, and this visual review does not establish accessibility compliance.

Review refinement preserved tiny nonzero values and added exact-value titles. The formatter regression, Astro checks and all seven affected bilingual content-parity/readability browser cases passed after this refinement.
