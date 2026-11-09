# 报告展示检查

[English](report-validation.en.md)

每次运行 `npm run build`，系统都会先运行 `npm run verify:reports`。检查失败时停止网站构建。共享 GitHub Actions 构建会将 `report-validation.json` 保存在对应构建分支的附件中：

- `report-validation-source-false`：源码构建。
- `report-validation-content-false`：可选的生产内容构建（已实现，尚未启用）。
- `report-validation-content-true-<omit>`：合成内容检查，`<omit>` 为 `none`、`weekly`、`us` 或 `asia`。`none` 覆盖全部报告族，其余情形验收合法缺席状态。

正式构建单独接收自己的回执路径；独立的单元测试和浏览器检查各自创建回执。可选报告族缺席时验证页面的空状态，但存在且为空的周报索引仍然无效。全部报告族均缺席的快照仍会被原有质量检查以 `no_reports` 拒绝。账本命名、实际运行次数和归档兼容性见[交接说明](daily-generation-options.zh-CN.md#发布记录)。

检查器读取已接收的公开快照，用网页实际使用的代码生成中英文晚报、美股日报和周报。排名条数按源表核对，同时检查图片中的数值、日期、只有缺失提示的两融区块、中英文事实是否一致，以及整图和分段图片是否超出大小限制。整图能生成时，分段图片也要通过检查。

检查范围是已接收数据的展示。研究是否通过评审、数据当时是否可用、上游是否提供了完整数据，需要各自的证据。源表只有部分记录时，检查器按实际条数核对。单个分段过长仍会阻断构建。

## 本地运行

```bash
npm run verify:reports -- --snapshot /path/to/frozen/public --receipt /path/outside/inputs/receipt.json
```

验收记录只能新建，必须放在输入目录之外。输入目录应当已经冻结，只包含普通文件和目录。检查器拒绝符号链接，并比较检查前后的文件哈希。调用方仍须阻止其他程序同时写入，检查器没有文件锁。

## 检查上游候选报告

添加 `--candidate /path/to/candidate.json` 即可检查上游生成的 Markdown。字段和示例见[英文说明](report-validation.en.md)。清单必须是单行规范 JSON，填写报告标识、Markdown 路径及哈希，以及提供方和消费方的完整提交号。

候选报告只在本次检查中替代同名报告，不会写入公开快照。提交号由调用方声明，验收记录会保留这些声明、实际检查器提交号及入口文件哈希。收集发布证据时应使用干净的代码目录。
