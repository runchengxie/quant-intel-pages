# 日报生成与网站交接

[English page](daily-generation-options.md)

## 当前职责

`quant-intel-platform` 生成报告并校验公开文件。`quant-intel-pages` 将文件渲染成网页并托管，生产发布和定时任务由 `quant-intel-deploy` 管理。

Deploy 将经过审核、带有公开标记的 Platform 报告快照提交到 Pages 的 `artifacts/public/`。Pages 的 `public-site.yml` 调用固定提交版本中的 `market-export-site-snapshot`，校验数据并导出网页所需的 `data/` 和 `reports/`，随后构建 Astro 页面。独立的网站工作流不调用模型、不生成报告，也不要求模型密钥。

## 日常变更

- 在 Platform 修改报告定义和计算。数据采集、模型调用及依据审核也由 Platform 负责。
- 页面布局和翻译在 Pages 修改，路由与下载也在这里维护。
- 定时任务和私有运行目录由 Deploy 管理。发布状态及 bot PR 的修改也放在 Deploy。
- 跨仓接口使用版本化公开文件或固定版本 CLI。禁止通过本地相邻目录导入其他仓库源码。

## 发布记录

网站工作流保存 `market-intel-ledger-<run_id>-1`，其中包含本次已校验的 `data/` 与 `reports/`。Deploy 以此账本复核发布来源。构建成功说明数据校验与静态渲染完成。还需核对 Deploy 的发布状态和 Pages 实际 URL，才能确认生产发布完成。

生产凭据、稳定发布目录和定时器属于仓库外配置。开发任务不应修改或触发这些配置。切换生产发布器前，应在独立的部署变更中检查待处理回执、回滚版本和两类报告 URL。

## 亚洲市场概览

Platform 在 `### 亚洲市场概览` 下发布六列表格，字段为 `市场 | 指数 | 数据日期 | 收盘 | 涨跌幅 | 状态`。香港使用恒生指数，日本使用日经 225，韩国使用 KOSPI。A 股指数放在自己的报告章节中。

可核实的收盘数据要有对应交易日和来源 URL，并保留交易所收盘时间及证据 ID。休市、数据缺失和未收盘的市场使用原报告的缺项符号，不沿用旧价格。Pages 展示这些文件，不请求新行情，也不推断交易日历。格式有误或来源不足的行继续显示为文字，其他已核实市场仍可阅读。历史四列休市版表格继续支持。

已有报告格式保持兼容。新增亚洲概览需要对应的 Platform 发布方支持，Pages 源码更新不会自动修改发布方或生产定时任务。

## 周报交接

Platform 提供 `market-export-weekly-recap` 和 `market-import-weekly-recap`。公开包包含 `weekly_recap.json`、`<date>-weekly.md` 及 `<date>-weekly.png`。导入后更新 `artifacts/public/data/weekly_recaps.json`，最多保留五个截止日期，并更新最新的 `weekly_recap.json`。

固定版本的 Platform 导出器先校验这些文件，Pages 再核对字段白名单、周五报告身份和带时区的生成时间。来源日期及观测顺序也需有效。内容哈希按 Python 的规范 JSON 计算，Markdown 和 PNG 必须匹配公开包。

网页只展示已提供的观测值。12 周收益率按百分比展示，净值指数和大小盘相对强度各自保留原单位，拥挤度使用 0 至 1。英文展示保留数字和局限，未覆盖的新段落会提示缺少译文，并保留中文原文。语言切换保留当期 URL，关闭 JavaScript 后仍可阅读正文。

定时任务与图片投递由 Deploy 管理。投递前需按发布事务核对线上报告身份，发布后通过回执和实际 URL 确认结果。

## 网页阅读与图片导出

日报正文使用网页文字展示。图片 SVG 保留在可展开的 `details[data-report-export]` 中，导出器继续使用唯一的 `#market-daily-chart svg` 或 `#asia-daily-chart svg`，并核对对应身份按钮。提取静态 HTML 时无需先展开该区域。来源和哈希规则保持不变，投递回执也保留原有含义。
