# Quant 市场情报网页

本仓库负责日报静态网站。`quant-intel-platform` 负责报告生成、证据审核和公开快照校验导出；`quant-intel-deploy` 负责生产定时发布。

[English README](README.md)

## 本地构建

需要 Python 3.11、Node.js 24、npm、uv，以及从固定 Platform 提交安装的 `market-export-site-snapshot` 命令。

```bash
uv tool install "git+https://github.com/runchengxie/quant-intel-platform.git@118ab01cf7f153bf09e0de25ceb4433100e42d7d"
npm ci
uv sync --locked --group dev --no-install-project
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

美股报告图片将收盘价或收益率放在统一对齐的数值列，与当日变化并排展示。变化条形以零为中心，各分组使用独立刻度；美债收益率与基点变化合并在同一行。历史报告缺少指数收盘点位时明确显示缺项。

亚洲市场解读使用与原文绑定的英文目录译文。缺少译文时，英文首页明确提示，并链接到保留的中文解读及依据。

## 语言行为

首页默认使用 `/en/` 英文页面，通过 `/?locale=zh-CN` 选择中文。首页其他 locale 参数值使用英文。报告页面分别使用 `/en/reports/<id>/` 和 `/reports/<id>/`，语言切换链接保留报告标识。不同语言的下载保留相同的来源数据、证据 ID、哈希和时间戳。英文解读缺少译文时明确提示，并保留来源语言的依据入口。

## TypeScript 检查范围

当前前端库和 React 图表组件已使用 TypeScript。四个报告路由的图片下载控件共用严格类型检查的模块和 locale 文案；`npm run check` 也检查 `ChartCards.astro`。

`src/legacy/` 和 `src/lib/market-daily-utils.js` 仍作为兼容浏览器的备用页面脚本发布，迁移时必须保留脚本 URL 和浏览器全局接口。Astro 页面暂时保留原有类型检查排除，待报告和 insight 加载器的类型覆盖模板所用字段后再纳入；当前不能视为整个前端均已通过严格类型检查。生成文件和已安装的 Platform CLI 则按各自边界单独排除。
