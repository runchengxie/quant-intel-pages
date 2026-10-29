# Quant 市场情报网页

[打开网站](https://runchengxie.github.io/quant-intel-pages/)，可以阅读美股早报、亚洲晚报和每周市场风格分析。

报告会注明数据日期，提供来源链接并说明缺失的数据。网站支持中英文切换，可以查看往期报告，也可以下载报告文件。本仓库负责这些网页。

[English](README.md)

## 在本地打开网站

需要 Python 3.11、Node.js 24、npm 和 uv。在本仓库目录运行下面的命令。报告导出命令的版本和构建输入见[维护指南](docs/technical-guide.md#本地构建)。

```bash
uv tool install "git+https://github.com/runchengxie/quant-intel-platform.git@c761aaa22cebd72283063ca11c4f1632f1c439fc"
npm ci
uv sync --locked --group dev --no-install-project
preview_root=$(mktemp -d /tmp/qmi-preview.XXXXXX)
python3 scripts/build_site.py --output "$preview_root/quant-intel-pages"
python3 -m http.server 8000 --directory "$preview_root"
```

打开 <http://localhost:8000/quant-intel-pages/> 即可预览。生成的网页保存在仓库外。

## 怎样修改项目

页面和图表在这里修改。`quant-intel-platform` 生成报告并审核依据，`quant-intel-deploy` 负责生产发布和报告更新监控。

[维护指南](docs/technical-guide.md)介绍页面结构和语言切换，也说明图片下载的处理方式。[日报交接说明](docs/daily-generation-options.zh-CN.md)解释报告文件怎样进入网站。参与开发前请阅读 [开发约定](AGENTS.zh-CN.md)。

同一检出中的 `npm test`、`npm run check`、网站构建和浏览器测试要依次运行。它们共用 Astro 构建缓存，同时运行可能导致构建失败。并行开发请使用独立工作树。
