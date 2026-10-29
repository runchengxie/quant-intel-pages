# Quant Market Intel Pages

Read the latest U.S. morning report, Asia evening review and weekly market style report on the [website](https://runchengxie.github.io/quant-intel-pages/).

This repository builds the report website. Reports include dated observations, source links and data limitations. You can switch between English and Chinese, read earlier editions and download report files.

[简体中文](README.zh-CN.md)

## Preview the site locally

Follow the [local preview instructions](docs/technical-guide.en.md#local-build) to install the requirements and build a copy of the website.

## Make a change

Edit pages and charts here. `quant-intel-platform` creates the reports and checks their evidence. `quant-intel-deploy` runs production publication and monitors report freshness.

Start with the [maintenance guide](docs/technical-guide.en.md) for page structure, language behavior and image downloads. The [handoff guide](docs/daily-generation-options.md) explains report inputs and publication records. Read [AGENTS.md](AGENTS.md) before contributing.

Run `npm test`, `npm run check`, site builds and browser tests in sequence within one checkout. They share Astro's build cache, so concurrent builds can break each other. Use separate worktrees for parallel work.
