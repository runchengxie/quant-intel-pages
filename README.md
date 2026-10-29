# Quant Market Intel Pages

Read the latest U.S. morning report, Asia evening review and weekly market style report on the [website](https://runchengxie.github.io/quant-intel-pages/).

This repository builds the report website. Reports include dated observations, source links and data limitations. You can switch between English and Chinese, read earlier editions and download report files.

[简体中文](README.zh-CN.md)

## Preview the site locally

Use Python 3.11, Node.js 24, npm and uv. Run these commands from the repository root. The [maintenance guide](docs/technical-guide.en.md#local-build) explains the pinned report exporter and build inputs.

```bash
uv tool install "git+https://github.com/runchengxie/quant-intel-platform.git@c761aaa22cebd72283063ca11c4f1632f1c439fc"
npm ci
uv sync --locked --group dev --no-install-project
preview_root=$(mktemp -d /tmp/qmi-preview.XXXXXX)
python3 scripts/build_site.py --output "$preview_root/quant-intel-pages"
python3 -m http.server 8000 --directory "$preview_root"
```

Open <http://localhost:8000/quant-intel-pages/>. Build output stays outside the repository.

## Make a change

Edit pages and charts here. `quant-intel-platform` creates the reports and checks their evidence. `quant-intel-deploy` runs production publication and monitors report freshness.

Start with the [maintenance guide](docs/technical-guide.en.md) for page structure, language behavior and image downloads. The [handoff guide](docs/daily-generation-options.md) explains report inputs and publication records. Read [AGENTS.md](AGENTS.md) before contributing.

Run `npm test`, `npm run check`, site builds and browser tests in sequence within one checkout. They share Astro's build cache, so concurrent builds can break each other. Use separate worktrees for parallel work.
