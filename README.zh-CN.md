# Quant 市场情报网页

本仓库负责日报静态网站。`quant-intel-platform` 负责报告生成、证据审核和公开快照校验导出；`quant-intel-deploy` 负责生产定时发布。

[English README](README.md)

## 本地构建

需要 Python 3.11、Node.js 24、npm、uv，以及从固定 Platform 提交安装的 `market-export-site-snapshot` 命令。

```bash
uv tool install "git+https://github.com/runchengxie/quant-intel-platform.git@118ab01cf7f153bf09e0de25ceb4433100e42d7d"
npm ci
python -m pip install --group dev
preview_root=$(mktemp -d /tmp/qmi-preview.XXXXXX)
python3 scripts/build_site.py --output "$preview_root/quant-intel-pages"
python3 -m http.server 8000 --directory "$preview_root"
```

打开 <http://localhost:8000/quant-intel-pages/>。构建器调用 Platform CLI 校验并导出最近五个报告日期的公开快照，再生成中文和英文 Astro 页面。报告下载路径仍为 `/data/` 和 `/reports/`。

## 仓库内容

- `src/`：Astro 前端、本地化页面、图表展示和旧版回退页。
- `artifacts/public/`：经过审核的公开快照；私有归档保存在仓库之外。
- `scripts/build_site.py`：前端构建适配器，不导入 Platform 源码。
- `scripts/public_site_alerts.py`：跟踪本仓库网站构建的失败与恢复，并维护对应 Issue。
- `.github/workflows/public-site.yml`：网站检查、发布账本和 GitHub Pages 部署。

工作流按提交固定 Platform 版本，保证快照使用已审核的所有者实现进行校验。网站工作流不读取模型密钥，也不生成报告。公开报告日期和年龄由 `quant-intel-deploy` 负责监控。职责边界和数据交接见 `AGENTS.md` 与[日报生成选项](docs/daily-generation-options.md)。

网页分别展示行情完整性、研究接入和发布状态，只接受与报告运行标识、日期和内容哈希一致的上游评估。旧快照缺少状态记录时显示未知；历史报告正文和质量说明继续保留。
