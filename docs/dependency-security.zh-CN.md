# 依赖安全复核

[English](dependency-security.md)

本地和 CI 使用 `node tools/dependency-audit.mjs /tmp/npm-audit.json`，完整执行 npm 审计，并保留原始 JSON。未复核漏洞、网络错误、无效响应和退出状态不一致都会阻止发布。

2026-11-18 对 [GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) 做了临时适用性复核，例外于 **2026-11-25 00:00 UTC** 到期，并绑定当前锁文件的 SHA-256。上游最新 picomatch 4.0.7 仍受影响，暂无正式修复版本。本次 14 项高危告警是同一公告沿依赖链传播的结果。

利用条件是攻击者能够提供重复 extglob 表达式。本站为静态构建，匹配表达式来自可信仓库配置；应用不接收用户 glob，日报 Markdown/JSON 不作为构建配置执行，线上没有 Node 服务。基于此使用范围暂时接受该项风险，**并未修复 picomatch 本身**。

检查器只接受该公告、包名、影响范围和严重性，以及完全追溯到该公告的依赖链。新漏洞、混合依赖链、缺失引用、循环引用和依赖变更仍阻止发布。审计原文上传为 CI artifact；例外在控制台明确显示。

到期前应检查上游修复并升级；若仍无补丁，需重新复核，不能自动延期。引入外部 glob 或不可信构建配置时应立即撤销例外。完整复核依据见英文文档。
