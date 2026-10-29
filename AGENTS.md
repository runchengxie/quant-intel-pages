# Quant Market Intel Pages maintenance instructions

[简体中文](AGENTS.zh-CN.md)

## Repository responsibilities

- This repository owns the Astro static frontend, website build adapter and GitHub Pages workflows. `quant-intel-deploy` is the sole owner of report freshness monitoring.
- This repository's `workflow_run` monitor tracks only its own website build success or failure and closes the corresponding GitHub Issue after recovery.
- `quant-intel-platform` owns data retrieval, indicator calculation, report writing, model orchestration, evidence review and `market-export-site-snapshot`. This repository exchanges files through an installed CLI pinned to a commit. Do not import Platform source code.
- `quant-intel-deploy` owns production publishers, publication state, scheduled tasks and public report date/age monitoring. Pages workflows do not generate reports or read model credentials.
- Public URLs retain the `/quant-intel-pages/` prefix. Downloads use `/data/` and `/reports/`.

## Data and archives

- `artifacts/public/data/` and `artifacts/public/reports/` are build inputs. The public publication window covers at most five report dates.
- Preserve report schemas, evidence IDs, timestamps, hashes and explicit public publication markers. Preview imports and verify paths before importing.
- Complete private archives stay outside the repository. Narrowing the public window must not delete private archives or Git history.
- Old Pages snapshots are historical material. Compare same-path data before overwriting it and retain archive-only data in the repository.
- Render report and model content as text. Do not inject external data as unsanitized HTML.

## Development and validation

Python and Node unit tests are in `tests/`. Playwright browser regressions are in `tests/browser/`.

Create a separate task branch and worktree from the latest `origin/main`. Make changes only in the task worktree. Preserve other contributors' work and do not change production configuration or timers.

After installing requirements, select the checks below according to the change scope. Public data contracts, publication workflows and page route changes require the complete checks. Site build outputs must use a temporary directory outside the repository.

```bash
uv run ruff check scripts tests tools
uv run ruff format --check scripts tests tools
uv run ty check
uv run vulture scripts tests tools --min-confidence 80
uv run python -m pytest --cov-report=xml
npm test
node --check src/legacy/app.js
node --check src/legacy/summary-utils.js
python scripts/build_site.py --output /tmp/quant-market-intel-check
npm run check
npm run test:browser
npm audit
uv run pip-audit --strict
python tools/audit_structure.py --output /tmp/market-intel-structure.json
git diff --check
```

Keep Python branch coverage at or above 85% and Ruff McCabe complexity at or below 10. The README describes operations available now. `docs/daily-generation-options.md` describes the upstream handoff. Record run dates and evidence. Do not describe plans as deployed capabilities.
