# Pages 报告新鲜度监控迁移实施计划

> **执行约束：** 按任务分支和独立 worktree 执行。先完成并合并 Deploy provider PR，再开始 Pages consumer 代码变更；不在生产机运行监控、不触发真实通知、不更改已安装 timer 或部署配置。

**目标：** 将 Pages 的公开报告年龄复核与亚洲市场延期规则完整迁入 Deploy，随后让 Pages 只监控自身网站构建结果。

**职责边界：** Platform 继续生成已校验报告；Deploy 负责线上日期落后检查、公开快照元数据与年龄复核、市场日历延期及生产通知；Pages 保留 Astro 网站、公开静态数据输入和 `workflow_run` 构建结果 Issue 跟踪。

## 必须先解决的设计约束

- Pages 当前亚洲逻辑用覆盖 SSE/HK/JP/KR 的已校验日历，且采用北京时间每日 22:00 的发布截止。Deploy 当前日历读取器只读取 SSE。实现前先查明 Deploy 数据根目录中可用且可验证的其他市场日历来源；不得把 SSE 日期当作所有亚洲市场的共同开市日。
- 若 Deploy 没有覆盖所需市场、日期范围和来源可信度的现成日历，provider 阶段应先补充可审计的日历输入合同及 fail-closed 校验，再进入 Pages 删除步骤。不得临时联网抓取未固定来源的数据，也不得保留两套并行生产监控作为最终状态。
- 将页面日期落后（已验证源比较）与年龄复核（线上快照时间）作为独立 findings；休市只可延期适用的亚洲年龄检查，不可隐藏已验证源领先线上、无效/缺失快照或日历不可用。

## 阶段一：Deploy provider

在 `/home/richard/code/.worktrees/quant-intel-deploy-pages-monitor-owner` 从最新 `origin/main` 创建 `fix/pages-monitor-owner` worktree。

### 1. 核实日历合同

- 检查 `scripts/market_pages_calendar.py`、`scripts/market_pages_sources.py`、`pyproject.toml` 与数据路径文档，列出可用于 SSE/HK/JP/KR 的日历源、覆盖期、时区和更新责任。
- 选择 Deploy 已有、具备版本/来源/覆盖校验的生产输入。若当前只有 SSE 可用，在测试和 runbook 明确记录阻塞原因，并设计同仓库可维护的日历合同；不复用 Pages 的静态 2026 投影作为长期运行数据。

### 2. 实现 Deploy 统一判断

- 扩展 `scripts/check_public_pages_freshness.py`：继续使用 `expected_us_date`、`expected_asia_date` 和 `compare_public_dates` 检查已验证本地输入；增加对两个公开快照的有界读取、日期/时间戳解析、未来值和缺失字段的校验。
- US 与 Asia 均按 Pages 原来的 96 小时规则检查市场日期结束时间和生成时间。保留 Asia 报告 `sections[].paragraphs[]` 中“生成时间”时间戳格式合同；若迁入时发现可从稳定 schema 获取时间则记录兼容策略，不静默放宽校验。
- Asia 年龄复核使用经过验证的多市场日历：当日开市且未到 22:00 时延期；当日休市时按现有 `session_expectation` 推导最后应完成的 session；日历缺失、过期、来源不可信或覆盖不足时告警，不能据此判为健康。
- 一旦存在任一来源已验证的期望日期，远端读取错误或相关快照无效须通知并以非零退出；若两类本地输入都尚未就绪则维持当前“不臆测日期”行为。
- 沿用现有 `notify_recovery_failure`、quality alert state、systemd service/timer 和生产变量，不新增通知目标或部署侧调度。

### 3. Deploy 测试与文档

- 更新 `tests/smoke/test_check_public_pages_freshness.py`，对年龄边界（96 小时与超出一秒）、未来生成时间、无效/缺失元数据、市场日历覆盖与信任失败、22:00 前后、长休市、source-lag 不被延期掩盖、远端不可达和无本地期望日期补充固定 fixture。
- 在 `docs/market-pages-publisher.md` 描述唯一 owner、年龄阈值、市场日历合同、fail-closed 行为和不变的 timer；不更改 `deploy/systemd/public-pages-freshness.*`。
- 执行 Deploy `AGENTS.md` 中完整本地门禁、pre-push hook 和 `git diff --check`。不得因私有仓库 PR 手动触发 GitHub Actions。
- 提交、推送并开 Deploy PR；required checks/本地质量门禁通过且无冲突后合并。记录 merge SHA，之后才开始阶段二。

## 阶段二：Pages consumer

在 `/home/richard/code/.worktrees/quant-intel-pages-remove-report-monitor` 从 Deploy provider 合并完成后的 Pages `origin/main` 创建 `fix/remove-report-freshness-monitor` worktree。

### 4. 移除 Pages 报告监控

- 修改 `.github/workflows/public-site-monitor.yml`：移除 schedule 与 freshness dry-run 入口，仅保留 `workflow_run`；权限收窄到该事件 Issue reconciliation 必需权限。
- 修改 `scripts/public_site_alerts.py`：删除 freshness mode、HTTP 抓取、snapshot evaluation 依赖与参数，仅保留现有 `workflow_run` 仓库/分支/结论/乱序校验、失败 Issue reconciliation 和恢复关闭行为。
- 删除 `scripts/public_site_freshness.py`、`scripts/public_site_calendar.py`、`configs/asia-calendar.json` 及 `tests/test_public_site_freshness.py`；从 alert 测试删除 freshness 专属用例，保留 workflow 行为测试。
- 更新 `AGENTS.md`、README 与相关运维说明，将公开报告 freshness owner 指向 Deploy；不要把 Deploy 的定时任务命令或生产配置复制进 Pages。

### 5. Pages 验证和合并

- 执行 Pages `AGENTS.md` 中完整 Python/Node/Astro/浏览器/安全和结构门禁，确认静态输入、页面 URL、路由、报告 schema、五日报告窗口与构建成功/失败 Issue 恢复行为不变。
- 开 Pages PR，写明 Deploy provider PR 与合并 SHA。远端必需检查通过、无冲突后合并。

## 完成后的只读核实与清理

- 只读核对现有 Deploy timer 下一次自然运行和状态；不手动启动 service、不制造真实告警。如果没有自然运行可观察，明确报告尚未验证生产运行，不以静态测试替代该事实。
- 核对两项 PR 的 merge SHA、远端 main 与变更补丁；清理仅限本计划创建的已合并 worktree/分支。保留已有其他 worktree、忽略数据和用户修改。

## 验收条件

- Deploy 测试证明年龄/日历规则的迁移结果与 Pages 旧固定 fixture 一致，且 source-lag、缺失/无效数据和日历失效均不会被休市延期遮蔽。
- Deploy PR 先于 Pages PR 合并；timer、配置、数据路径、凭据和通知目标无改动。
- Pages 不再含有定时检查公开日报新鲜度的 workflow、脚本或日历投影；自身网站构建失败及恢复 Issue 跟踪继续有效。
- 两边指定本地门禁均通过；生产自然运行若未发生，标记为未验证。
