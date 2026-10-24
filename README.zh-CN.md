# Quant 市场情报网页

本仓库负责日报和周报静态网站。`quant-intel-platform` 负责报告生成、证据审核和公开快照校验导出；`quant-intel-deploy` 负责生产定时发布。

[English README](README.md)

## 本地构建

需要 Python 3.11、Node.js 24、npm、uv，以及从固定 Platform 提交安装的 `market-export-site-snapshot` 命令。

```bash
uv tool install "git+https://github.com/runchengxie/quant-intel-platform.git@c761aaa22cebd72283063ca11c4f1632f1c439fc"
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

`src/legacy/` 和 `src/lib/market-daily-utils.js` 仍作为兼容浏览器的备用页面脚本发布，迁移时必须保留脚本 URL 和浏览器全局接口。所有自有 Astro 页面已纳入严格类型检查。Insight 展示字段在 JSON 边界校验，来源身份、哈希和证据保持语言无关。生成文件和已安装的 Platform CLI 则按各自边界单独排除。

亚洲晚报图片同时消费普通交易日和内地休市版的同一亚洲市场概览。香港、日本、韩国分别保留交易日期、休市/缺失/未收盘状态及来源；网页不抓取或回填行情，历史休市版表格仍可阅读。
旧版控制器及其三个工具模块以 `src/legacy-source/` 中的严格检查 TypeScript 为准。修改这些模块或 `market-daily-utils.ts` 后运行 `npm run legacy:build`；`npm run check` 会拒绝过期的兼容产物。生成的 JavaScript 保留原有 URL、浏览器全局和 CommonJS 导出。旧版入口的浏览器测试覆盖报告和日期筛选、主题偏好持久化、可选数据加载失败和安全文本渲染。并行运行浏览器测试时，设置 `PLAYWRIGHT_PORT` 使用独立端口。

定时晨报和晚报发布使用事实型报告，不生成 AI 解读。历史解读仍可阅读；即使没有解读历史，也不会阻止发布。

亚洲报告图片在同一张表中展示指数数值和以零为中心的涨跌幅条形。行业、成交额、概念和涨跌幅榜表格保留已发布的数字，并增加按列缩放的条形。已有图表覆盖的市场概览、涨跌停和资金流段落会省略；未覆盖的文字和格式异常的事实仍会显示。上涨和下跌 Top 5 分组展示，并共用涨跌幅刻度。仅当底部仪表盘计数与已绘制事实在数值、单位、日期和已知来源契约上都一致时才省略。市场概览图只采用完整且分桶数量与报告覆盖数一致的涨跌分布，并区分包含零值的分桶与上涨股票计数。缺失或格式异常的事实继续以文字呈现，不会被转换成猜测图表。

亚洲晚报图片将“亚洲市场图表”放在顶部；亚洲市场概览保留收盘点位、日期和交易状态，并以零轴条形及百分比显示涨跌幅。A 股指数独立标为“A股指数总览”。


## 周报阅读与数据交接

首页导航提供周报入口：英文 `/en/weekly/`，中文 `/weekly/?locale=zh-CN`。按日期打开报告后可下载审核通过的原始 PNG，阅读完整正文、来源标识和历史观测表。交互图表仅在展开时加载；关闭 JavaScript 后仍可查看图片和完整报告。英文页面明确说明正文使用中文原文。

周报输入采用 Platform 的公开交接格式，最多保留五个报告日期。页面构建会独立校验字段白名单、周五截止日期、来源日期、观测顺序、内容哈希和图片哈希；不一致时停止构建。Python 3 仅用于构建时的规范 JSON 哈希计算。浏览器测试在仓库外使用合成样本，不修改生产报告。生产发布、线上身份核验和图片发送由 Deploy 负责。
