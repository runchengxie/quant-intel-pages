# 日报生成与网站交接

## 当前职责

`quant-intel-platform` 是数据、报告和公开快照校验的所有者；`quant-intel-pages` 负责渲染和托管静态网页；`quant-intel-deploy` 负责生产发布和定时器。

Platform 将带有公开标记的报告快照提交到 Pages 的 `artifacts/public/`。Pages 的 `public-site.yml` 调用固定提交版本中的 `market-export-site-snapshot`，校验数据并导出网页所需的 `data/` 和 `reports/`，随后构建 Astro 页面。独立的网站工作流不调用模型、不生成报告，也不要求模型密钥。

## 日常变更

- 报告口径、采集、计算、模型调用和证据审核：在 Platform 修改。
- 页面布局、翻译、路由、下载和静态展示：在 Pages 修改。
- 定时器、私有运行目录、发布状态和 bot PR：在 Deploy 修改。
- 跨仓接口使用版本化公开文件或固定版本 CLI。禁止通过本地相邻目录导入其他仓库源码。

## 发布记录

网站工作流保存 `market-intel-ledger-<run_id>-1`，其中包含本次已校验的 `data/` 与 `reports/`。Deploy 以此账本复核发布来源。构建成功只说明数据校验与静态渲染完成；生产发布是否完成以 Deploy 的发布状态和 Pages 实际 URL 核验为准。

生产凭据、稳定发布目录和定时器属于仓库外配置。开发任务不应修改或触发这些配置。切换生产发布器前，应在独立的部署变更中检查待处理回执、回滚版本和两类报告 URL。
