# 网站与公开数据维护

## 构建链路

1. Platform 根据报告的公开状态、来源路径、内容哈希和 schema 校验公开快照。
2. Pages 的构建适配器调用固定版本的 `market-export-site-snapshot`，将公开数据写入临时目录。
3. Astro 从临时快照生成中文、英文首页和报告页，并写入静态站点输出目录。
4. `public-site.yml` 上传静态站点和发布账本；生产报告写入及定时发布由 Deploy 完成。

构建器先完成临时导出与页面渲染，成功后再替换目标目录。CLI 缺失或 Astro 构建失败时，不会用不完整内容覆盖已有输出。

## 公开快照

输入位于 `artifacts/public/data/` 和 `artifacts/public/reports/`。公开窗口最多保留五个报告日期。静态构建输出在站点根目录生成 `data/` 与 `reports/`，所以网页 URL 不含 `artifacts/public/` 这一层。

输入 schema、图表审核和报告内容校验由 Platform 所有。Pages 的验证集中在 CLI 交接、页面渲染、下载路径、语言切换以及站点监控。

## 本地操作

```bash
npm ci
python -m pip install --group dev
python scripts/build_site.py --output /tmp/quant-market-intel-check
npm run check
npm run test:browser
```

本地构建需先安装与工作流相同提交的 Platform CLI。不要把构建结果、运行日志、原始数据或凭据写入 Git 仓库。
