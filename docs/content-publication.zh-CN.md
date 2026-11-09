# 使用已验证的外部内容构建网站

[English](content-publication.md)

Pages 可以直接渲染经 Platform 验证的内容包，无需修改 Git 中的报告输入。
新增工作流可在显式启用后发布这些内容包，默认仍使用旧源码部署。
生产启用、发布协调与线上核验需要另行配置 Deploy 协调器。

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

v2 核验要求构建器、导出器、运行时版本、锁文件及验证记录的嵌套字段完整且无多余项。它检查命令参数与源码、内容身份是否一致，验证来源哈希与字段类型，并将校验器版本和哈希与已绑定字节摘要的质量回执逐项比对。离线核验不会再次执行已安装的导出器。

## 显式启用内容发布

仓库变量 `CONTENT_PUBLICATION_MODE` 未设置或设为 `legacy` 时保留源码部署；
设为 `artifact-v1` 才启用内容发布，其他值会校验失败。本次实现不启用生产内容模式。

两个构建配置共用 `site-build.yml`。源码 PR、push 保留完整源码、依赖和浏览器检查，
并执行合成内容构建验收。在内容模式下，这些运行只生成预览；
Deploy 协调器发现已合入且源码检查成功的新渲染版本后，须用最近确认的内容发起新候选发布。
源码提交不会自行部署仓库中的旧报告。

`publish-content.yml` 接收 `candidate_id`、`content_asset_id`、
`content_sha256`、`producer_revision`、`renderer_revision` 和
`expected_parent_publication_id`。必须在 main 上触发；渲染版本须等于 GitHub 为本次
运行实际选定的 main 提交，并已有成功的 main push 源码检查。该提交还须对应已合入本仓库
main 的 PR，且等于该 PR 的合并结果提交。
main 前进后须建立新的渲染候选，不能由请求选择其他检出版本、仓库、URL 或命令。

下载器只访问固定公开 Pages 仓库的 Release asset API，核对 asset ID、声明大小和归档
SHA-256，流式读取不超过 64 MiB，最多跟随三次明确允许的 GitHub 资源域名重定向。
请求不携带 Authorization 或 Cookie。固定版本的已安装 Platform CLI 复验内容包后，
Pages 才构建并对实际输出运行浏览器冒烟检查。

旧部署和完整内容发布事务共用 `quant-intel-pages-production`，不取消正在运行的任务。
GitHub 可能替换排队任务；Deploy 须核对被取消或仍排队的请求，并复用不可变候选重试。
部署仍使用受保护的 `github-pages` 环境。

构建前和部署前分别将预期父发布与线上标记比较。
仅在线上标记不存在且从未有成功内容工作流时接受显式 `__bootstrap__`；
它只用于首次内容部署，不是父发布不匹配后的回退。
相同候选 ID 的内容与渲染身份完全一致时跳过部署；同一 ID 对应不同内容则失败。

本地正式内容构建可在上面的命令中增加 `--publication-context <JSON 路径>`。
可信调用方提供且仅提供六个字符串字段：`candidate_id`、`content_sha256`、
`producer_revision`、`renderer_revision`、`workflow_run_id` 和
`workflow_run_attempt`。运行编号须与当前 Actions 环境一致。
该文件须与源码、输入、输出及回执路径分离，不能从内容包中取得。

报告质量检查通过后、最终输出哈希计算前，Pages 写入
`data/site-publication.json`。其 schema 为
`market_intel_pages.site_publication.v1`，只包含发布、内容包和归档身份、
生产者与渲染提交以及运行编号和重试次数。内容包不能提供这个保留路径。
v2 构建身份绑定标记的准确字节和可信上下文文件摘要；私有身份、上下文文件不会进入网站。

既有 `market-intel-ledger-<run>-<attempt>` 产物保留原始归档、已验证输入树、
owner 回执、上下文、构建身份、质量回执和最终数据及报告下载文件（含标记）。
Actions 保存期为 90 天；永久归档及线上报告日期、哈希核对仍归 Deploy。
监控器分别追踪源码和内容构建失败，报告新鲜度仍由 Deploy 负责。

启用前须另行授权并完成协调器初始化、排空旧待发布及正在运行的发布，再修改仓库变量。
回滚须使用核对后的归档快照与固定旧发布器，不能简单重新启用旧 Git 输入。
