# Quant Market Intel Pages

This repository owns the static website for daily market reports. `quant-intel-platform` owns report generation, evidence review, and the validated public snapshot exporter. `quant-intel-deploy` owns scheduled production publishers.

[中文说明](README.zh-CN.md)

## Local build

Requirements: Python 3.11, Node.js 24, npm, uv, and the `market-export-site-snapshot` command installed from the pinned Platform commit.

```bash
uv tool install "git+https://github.com/runchengxie/quant-intel-platform.git@c7a73f9ea7d2609c0e186517995b956292a1630f"
npm ci
python -m pip install --group dev
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
