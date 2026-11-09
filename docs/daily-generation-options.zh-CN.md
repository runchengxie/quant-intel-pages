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

网站工作流保存 `market-intel-ledger-<run_id>-1`，其中包含本次已校验的 `data/` 与 `reports/`，以及独立的 `build-identity.json` 和 `report-validation.json`。Deploy 以此账本复核发布来源。构建成功说明数据校验与静态渲染完成。还需核对 Deploy 的发布状态和 Pages 实际 URL，才能确认生产发布完成。

### 构建身份

正式工作流要求生成 `market_intel_pages.build_identity.v1`。记录包含干净的 Pages 源码版本、已安装导出器的不可变 VCS 提交、启动脚本与 owner 包的 RECORD 哈希，以及实际模块导入位置、已安装依赖版本和锁文件哈希、原始公开输入、导出后的校验快照、通过的质量回执，以及最终输出逐文件哈希。原始输入、导出快照和渲染输出使用不同目录。正式导出使用已核验解释器的 `-I` 模式，并清除 `PYTHONPATH` 和 `PYTHONHOME`。最终输出须逐项保留导出快照的原字节，渲染器不得覆盖已校验的下载文件；summaries 覆盖输入须位于输出目录之外。输入变化或回执失败会阻止替换输出；回滚本身失败时会保留恢复材料并报告位置。

工作流在上传网站前核对输出和质量回执哈希，身份文件不会进入公开网站。任务 ID 包含实际 run ID 和 attempt；账本名称暂保留兼容的 `-1` 后缀。CI 账本保留 90 天；Deploy 现有归档步骤将其永久保存到配置的 archive root 下 `pages_ledgers/<artifact-id>`，并另存 artifact、run 和文件哈希回执。身份中的 `completed` 仅表示构建完成；发布还需对应的工作流部署、publisher 状态和实际 URL 佐证。

本地构建可选择启用身份记录，需要干净源码和从固定 VCS 提交安装的导出器，不接受目录或 editable 安装。先按[本地构建指南](technical-guide.md#本地构建)安装固定 CLI，解析本机 `DATA_ROOT`，然后选一个新的任务目录：

```bash
task_output="$DATA_ROOT/quant/quant-intel-pages/tasks/<task-id>"
mkdir -p "$task_output"
python scripts/build_site.py --output "$task_output/site" \
  --identity "$task_output/build-identity.json" \
  --quality-receipt "$task_output/report-validation.json" \
  --task-id '<task-id>' --exporter-revision '<installed-40-character-commit>'
python scripts/build_identity.py verify --identity "$task_output/build-identity.json" \
  --output "$task_output/site" --quality "$task_output/report-validation.json"
```

回执须使用源码和输出之外的新路径，不允许经过符号链接。导出器需要直接使用 Python 解释器的 console script。正式模式缺少来源或质量证据时会停止；不传这四个身份参数的普通构建仍可使用。记录证明实际观察到的字节和来源，不承诺不同操作系统或依赖环境会生成完全相同的输出。历史构建的源码、任务和执行者仍按未知保留。身份记录不授权删除归档，须另遵守[归档生命周期](archive-lifecycle.md)和 owner 的明确留存决定。

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

## 已验证的外部内容

构建适配器也支持验证后的外部输入根目录及对应上游回执，并强制生成 v2 身份记录；源码输入构建保留 v1。成对的 API/CLI 参数、源码与内容身份区分，以及目前仅支持本地构建的范围，详见[外部内容构建](content-publication.zh-CN.md)。现有工作流仍使用仓库输入；内容生产模式须另行启用。
