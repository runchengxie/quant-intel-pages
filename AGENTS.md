# Quant Market Intel Pages 维护约定

## 仓库职责

- 本仓库维护 Astro 静态前端、网页构建适配器、公开网址新鲜度监控和 GitHub Pages 工作流。
- `quant-intel-platform` 维护数据采集、指标计算、报告写作、模型编排、证据审核及 `market-export-site-snapshot`。本仓库通过已固定版本的安装 CLI 交接，不导入 Platform 源码。
- `quant-intel-deploy` 维护生产发布器、发布状态和定时任务。Pages 工作流不生成报告，也不读取模型密钥。
- 公共 URL 保持以 `/quant-intel-pages/` 为前缀，下载数据和报告使用 `/data/` 与 `/reports/`。

## 数据与归档

- `artifacts/public/data/` 和 `artifacts/public/reports/` 是构建输入，公开发布窗口最多覆盖五个报告日期。
- 保留报告 schema、证据 ID、时间戳、哈希和明确的公开发布标记。导入前预览并核对路径。
- 私有全量归档保存在仓库之外。公开窗口缩小时不删除私有归档或 Git 历史。
- 旧 Pages 快照是历史材料。覆盖同路径数据前先比对，并将仅归档数据保留在仓库中。
- 页面将报告和模型内容作为文本渲染；外部数据不得作为未经清理的 HTML 注入。

## 开发与验证

从最新 `origin/main` 为任务建立独立分支和 worktree。只在任务 worktree 修改；不覆盖他人工作，也不改生产配置或定时器。

安装要求后，按修改范围运行下列检查。公开数据契约、发布工作流或页面路由变更需要完整检查。站点构建输出必须放在仓库外的临时目录。

```bash
ruff check scripts tests tools
ruff format --check scripts tests tools
ty check
vulture scripts tests tools --min-confidence 80
python -m pytest --cov-report=xml
npm test
node --check src/legacy/app.js
node --check src/legacy/summary-utils.js
python scripts/build_site.py --output /tmp/quant-market-intel-check
npm run check
npm run test:browser
npm audit
pip-audit --strict
python tools/audit_structure.py --output /tmp/market-intel-structure.json
git diff --check
```

保持 Python 分支覆盖率不低于 85%，Ruff McCabe 复杂度不高于 10。README 说明当前可用操作；`docs/daily-generation-options.md` 说明上游交接。记录运行日期和证据，不将计划描述成已部署能力。
