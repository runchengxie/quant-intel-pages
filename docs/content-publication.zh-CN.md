# 使用已验证的外部内容构建网站

[English](content-publication.md)

Pages 可以直接渲染经 Platform 验证的内容包，无需修改 Git 中的报告输入。
这项能力目前用于本地构建；现有源码工作流仍部署仓库中的输入。
内容生产模式的启用、工作流触发、发布协调与线上核验属于后续独立工作。

先按[本地构建指南](technical-guide.md#本地构建)安装固定版本的 Platform CLI。
内容生产者与导出器均须使用已合并提交
`70d21f8683cdbe3b7841e2a7f4e10f57d1c2a8be`。
调用上游的 `market-pack-site-content` 和 `market-verify-site-content`，
生成不可变归档及包含 `artifacts/public/data/`、`artifacts/public/reports/`
的验证后输入目录。
详见 [Platform 内容包契约](https://github.com/runchengxie/quant-intel-platform/blob/70d21f8683cdbe3b7841e2a7f4e10f57d1c2a8be/docs/publication/site-content-bundles.zh-CN.md)。

在源码、输入和输出目录之外选择新的回执路径：

~~~bash
task_output="$DATA_ROOT/quant/quant-intel-pages/tasks/<task-id>"
producer_revision="70d21f8683cdbe3b7841e2a7f4e10f57d1c2a8be"
python scripts/build_site.py --root "$CODE_ROOT/quant/quant-intel-pages" \
  --output "$task_output/site" \
  --public-inputs "$task_output/verified" \
  --content-receipt "$task_output/verify-receipt.json" \
  --identity "$task_output/build-identity.json" \
  --quality-receipt "$task_output/report-validation.json" \
  --task-id '<task-id>' --exporter-revision "$producer_revision"
python scripts/build_identity.py verify \
  --identity "$task_output/build-identity.json" \
  --output "$task_output/site" --quality "$task_output/report-validation.json"
~~~

Python 的 `build_site` 接口新增仅限关键字的 `public_inputs: Path | None`
和 `content_receipt: Path | None`，必须同时提供，并设置 `identity_options`。
外部模式不接受 `summaries_path` 覆盖。
输入参数指向验证后的根目录，而非其下的 `artifacts/public`。
输入缺失或不匹配时直接失败，不会回退到仓库中的旧报告。
回执中的哈希、字节数、生产者版本及完整文件集合必须与输入一致。
源码、外部输入、内容回执、输出和生成回执的路径必须互不包含，不可经过符号链接。
Pages 源码检出必须干净。

外部构建生成 `market_intel_pages.build_identity.v2`，记录：

- 实际干净的 Pages Git 提交和源码绝对路径。
- 已验证的内容包 ID、归档 SHA-256、生产者提交、创建时间、
  按路径排序的原始文件记录，以及内容回执的路径和字节哈希。
- 原始外部输入目录与哈希、规范化导出快照、通过的 Pages 质量回执，以及所有输出文件哈希。
- 已安装导出器的 VCS、RECORD、实际模块来源证据和隔离执行命令。

内容包 ID 与归档摘要是内容标识，不是源码提交。
回执说明已验证的输入字节，不代表发布授权；请保留原始归档和上游回执以供审计。
离线身份核验检查 v2 字段及最终输出与质量回执的对应关系，
不会重新验证归档，也不能证明发布批准者的身份。

Platform 负责规范化和公开资格校验。再次导出可能重新生成健康状态与美股状态文件，
并按来源绑定筛选评论；规范化 JSON 的字节也可能与归档不同。
因此，原始输入和导出快照分别记录哈希。
Pages 调用上游导出器及自身质量校验器，并要求每个已导出的下载文件在最终网站中保持字节一致；
不会为任意文件变化提供通用豁免。

渲染期间输入、回执、源码或导出器变化都会阻止输出提升。
提升失败时恢复旧输出；若回滚也失败，错误会指出保留的恢复材料。
重试须选择新的质量及身份回执路径，所有身份和内容回执均放在公开输出之外。
如需指定临时渲染目录，可将 `ASTRO_WORK_ROOT` 设为源码所在文件系统上的外部可写目录；
旧版构建保留原来的默认位置。

不提供外部输入时，已有行为及 `market_intel_pages.build_identity.v1` 格式不变，
历史 v1 回执仍可读取。
发布证据详见[交接指南](daily-generation-options.zh-CN.md)；
删除任何保留材料前请阅读[归档生命周期](archive-lifecycle.md)。
